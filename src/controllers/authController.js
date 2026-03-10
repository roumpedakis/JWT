const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');
const Code = require('../models/Code');
const Token = require('../models/Token');

// ─── Βοηθητικές συναρτήσεις ──────────────────────────────────────────────────

const now = () => Math.floor(Date.now() / 1000);

const hmac = (data, secret) =>
    crypto.createHmac('sha256', secret).update(data).digest('hex');

const randomHex = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');

const checkAgent = async (client_id) =>
    Agent.findOne({ client_id });

// Δημιουργεί μοναδικό code/pin με retry έως 10 φορές
const generateUnique = async (field, generator, client_id, expSeconds) => {
    for (let i = 0; i < 10; i++) {
        const value = generator();
        const expTime = now() + expSeconds;
        const existing = await Code.findOne({ client_id, [field]: value });

        if (!existing) {
            return { value, exp: expTime };
        }
        if (existing.exp < now()) {
            // Έχει λήξει — αντικατάσταση
            await Code.deleteOne({ client_id, [field]: value });
            return { value, exp: expTime };
        }
        // Υπάρχει και ισχύει — δοκίμασε ξανά
    }
    return null;
};

// ─── GET /auth/code ───────────────────────────────────────────────────────────

exports.getCode = async (req, res) => {
    const client_id = req.headers['client_id'] || req.headers['client-id'];
    const { aud, hash, lang } = req.query;

    const agent = await checkAgent(client_id);
    if (!agent) return res.status(403).json({ error: 'Invalid client_id' });

    const expectedHash = hmac(`${client_id}:${aud}`, agent.client_secret);
    if (hash !== expectedHash) return res.status(403).json({ error: 'Invalid hash' });

    const result = await generateUnique('code', () => randomHex(16), client_id, agent.code_exp);
    if (!result) return res.status(500).json({ error: 'Failed to generate unique code' });

    await Code.create({ client_id, code: result.value, aud, exp: result.exp });

    return res.status(200).json({
        code: result.value,
        url: `${process.env.LOGIN_URL || '/auth/login'}?code=${result.value}&lang=${lang || 'EN'}`,
    });
};

// ─── POST /auth/sms ───────────────────────────────────────────────────────────

exports.sendSms = async (req, res) => {
    const client_id = req.headers['client_id'] || req.headers['client-id'];
    const { hash, lang } = req.query;
    const { user, aud } = req.body;

    const agent = await checkAgent(client_id);
    if (!agent) return res.status(403).json({ error: 'Invalid client_id' });

    const expectedHash = hmac(`${client_id}:${user}:${aud}`, agent.client_secret);
    if (hash !== expectedHash) return res.status(403).json({ error: 'Invalid hash' });

    // Έλεγχος χρήστη — placeholder, σύνδεσε με τη δική σου users DB
    const userRecord = await lookupUser(user);
    if (!userRecord) return res.status(403).json({ error: 'User not found' });
    if (!userRecord.mobile) return res.status(400).json({ error: 'No mobile number set' });

    // Διαγραφή παλιών codes για client_id + user + aud
    await Code.deleteMany({ client_id, user, aud });

    const pin = () => String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    const result = await generateUnique('pin', pin, client_id, agent.pin_exp);
    if (!result) return res.status(500).json({ error: 'Failed to generate unique PIN' });

    await Code.create({ client_id, pin: result.value, user, aud, exp: result.exp });

    const smsSent = await sendSmsToUser(userRecord.mobile, result.value, lang);
    if (!smsSent) {
        await Code.deleteOne({ client_id, pin: result.value });
        return res.status(500).json({ error: 'Failed to send SMS' });
    }

    return res.status(200).json({ success: true });
};

// ─── POST /auth/token ─────────────────────────────────────────────────────────

exports.issueTokens = async (req, res) => {
    const client_id = req.headers['client_id'] || req.headers['client-id'];
    const { hash } = req.query;
    const { grant, code, pin } = req.body;

    const agent = await checkAgent(client_id);
    if (!agent) return res.status(403).json({ error: 'Invalid client_id' });

    const credential = grant === 'code' ? code : pin;
    const expectedHash = hmac(`${client_id}:${credential}`, agent.client_secret);
    if (hash !== expectedHash) return res.status(403).json({ error: 'Invalid hash' });

    // Βρες το record στη Codes
    const query = grant === 'code' ? { client_id, code } : { client_id, pin };
    const codeRecord = await Code.findOne(query);

    if (!codeRecord) return res.status(401).json({ error: 'Invalid code/pin' });
    if (codeRecord.exp < now()) {
        await Code.deleteOne(query);
        return res.status(401).json({ error: 'Code/pin expired' });
    }
    await Code.deleteOne(query);

    const { user, aud } = codeRecord;
    const scopes = agent.scopes || '';

    // Δημιουργία JWT tokens
    let accessToken, refreshToken;
    try {
        ({ accessToken, refreshToken } = await createTokenPair(agent, user, aud, scopes));
    } catch (e) {
        return res.status(500).json({ error: 'Failed to create tokens' });
    }

    // Αφαίρεση παλιών tokens για user + aud
    await Token.deleteMany({ user, aud });

    // Αποθήκευση νέων tokens
    const accessPayload = jwt.decode(accessToken);
    const refreshPayload = jwt.decode(refreshToken);

    await Token.insertMany([
        { jti: accessPayload.jti, type: 0, iat: accessPayload.iat, exp: accessPayload.exp, client_id, aud, user, scopes },
        { jti: refreshPayload.jti, type: 1, iat: refreshPayload.iat, exp: refreshPayload.exp, client_id, aud, user, scopes },
    ]);

    return res.status(200).json({ access: accessToken, refresh: refreshToken });
};

// ─── POST /auth/token/refresh ─────────────────────────────────────────────────

exports.refreshToken = async (req, res) => {
    const { token } = req.body;

    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        return res.status(401).json({ error: e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' });
    }

    const stored = await Token.findOne({ jti: payload.jti, type: 1 });
    if (!stored) return res.status(401).json({ error: 'Token not found' });

    const agent = await checkAgent(stored.client_id);
    if (!agent) return res.status(401).json({ error: 'Agent not found' });

    let accessToken;
    try {
        accessToken = createAccessToken(agent, stored.user, stored.aud, stored.scopes);
    } catch (e) {
        return res.status(500).json({ error: 'Failed to create access token' });
    }

    await Token.deleteMany({ user: stored.user, aud: stored.aud, type: 0 });

    const accessPayload = jwt.decode(accessToken);
    await Token.create({
        jti: accessPayload.jti,
        type: 0,
        iat: accessPayload.iat,
        exp: accessPayload.exp,
        client_id: stored.client_id,
        aud: stored.aud,
        user: stored.user,
        scopes: stored.scopes,
    });

    return res.status(200).json({ access: accessToken });
};

// ─── Βοηθητικές JWT ──────────────────────────────────────────────────────────

function buildJti(client_id, user, aud, scopes, secret) {
    return hmac(`${client_id}${user}${aud}${scopes}`, secret);
}

function createAccessToken(agent, user, aud, scopes) {
    const iat = now();
    const exp = iat + agent.access_exp;
    const jti = buildJti(agent.client_id, user, aud, scopes, agent.client_secret);
    return jwt.sign({ jti, iat, exp, aud, scopes, user }, process.env.JWT_SECRET, { algorithm: 'HS256', noTimestamp: true });
}

function createTokenPair(agent, user, aud, scopes) {
    const rIat = now();
    const rExp = rIat + agent.refresh_exp;
    const rJti = buildJti(agent.client_id, user, aud, scopes + '_refresh', agent.client_secret);

    const accessToken = createAccessToken(agent, user, aud, scopes);
    const refreshToken = jwt.sign({ jti: rJti, iat: rIat, exp: rExp, aud, scopes, user }, process.env.JWT_SECRET, { algorithm: 'HS256', noTimestamp: true });

    return { accessToken, refreshToken };
}

// ─── Placeholders — σύνδεσε με τη δική σου λογική ────────────────────────────

async function lookupUser(username) {
    // TODO: σύνδεση με users database
    // Παράδειγμα: return await UserModel.findOne({ username });
    return { username, mobile: null }; // αλλάξτο
}

async function sendSmsToUser(mobile, pin, lang) {
    // TODO: σύνδεση με SMS provider (π.χ. Twilio, Vonage)
    console.log(`[SMS] Στάλθηκε PIN ${pin} στο ${mobile}`);
    return true;
}
