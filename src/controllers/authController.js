const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');
const Code = require('../models/Code');
const Token = require('../models/Token');
const User = require('../models/User');
const Dictionary = require('../utils/Dictionary');

// Helpers

const now = () => Math.floor(Date.now() / 1000);

const hmac = (data, secret) =>
    crypto.createHmac('sha256', secret).update(data).digest('hex');

const randomHex = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');

const sha256Hash = (data) =>
    crypto.createHash('sha256').update(data).digest('hex');

const checkAgent = async (client_id) => Agent.findOne({ client_id });

const getClientId = (req) => req.headers['client_id'] || req.headers['client-id'];

const normalizeGrant = (grant) => String(grant || '').trim().toLowerCase();

function badRequest(req, res, key) {
    return sendError(req, res, 400, key);
}

function sendError(req, res, status, key, extra = {}) {
    const lang = Dictionary.fromRequest(req);
    const payload = Dictionary.get(key, lang);
    return res.status(status).json({
        errors: [
            {
                code: payload.code,
                message: payload.message,
            },
        ],
        ...extra,
    });
}

function sendSuccess(req, res, key, extra = {}) {
    const payload = Dictionary.get(key, Dictionary.fromRequest(req));
    const { code: _ignoreCode, message: _ignoreMessage, ...safeExtra } = extra;
    return res.status(200).json({ code: payload.code, ...safeExtra, message: payload.message });
}

// Create unique code/pin with up to 10 retries
const generateUnique = async (field, generator, client_id, expSeconds) => {
    for (let i = 0; i < 10; i++) {
        const value = generator();
        const expTime = now() + expSeconds;
        const existing = await Code.findOne({ client_id, [field]: value });

        if (!existing) {
            return { value, exp: expTime };
        }
        if (existing.exp < now()) {
            await Code.deleteOne({ client_id, [field]: value });
            return { value, exp: expTime };
        }
    }
    return null;
};

exports.getCode = async (req, res) => {
    try {
        const client_id = getClientId(req);
        const { aud, hash, lang } = req.query;
        if (!client_id) return badRequest(req, res, 'missing_client_id_header');
        if (!aud) return badRequest(req, res, 'missing_aud');
        if (!hash) return badRequest(req, res, 'missing_hash');

        const agent = await checkAgent(client_id);
        if (!agent) return sendError(req, res, 403, 'invalid_client_id');

        const expectedHash = hmac(`${client_id}:${aud}`, agent.client_secret);
        if (hash !== expectedHash) return sendError(req, res, 403, 'invalid_hash');

        const result = await generateUnique('code', () => randomHex(16), client_id, agent.code_exp);
        if (!result) return sendError(req, res, 500, 'failed_generate_unique_code');

        await Code.create({ client_id, code: result.value, aud, exp: result.exp });

        return sendSuccess(req, res, 'ok_code_generated', {
            auth_code: result.value,
            url: `${process.env.LOGIN_URL || '/auth/login'}?code=${result.value}&lang=${lang || 'EN'}`,
        });
    } catch (error) {
        console.error('getCode error:', error);
        return sendError(req, res, 500, 'internal_server_error');
    }
};

// UI flow: bind code to authenticated user after external login page success
exports.assignCodeUser = async (req, res) => {
    try {
        const client_id = getClientId(req);
        const { hash } = req.query;
        const { code, user } = req.body;
        if (!client_id) return badRequest(req, res, 'missing_client_id_header');
        if (!code || !user) return badRequest(req, res, 'missing_code_or_user');
        if (!hash) return badRequest(req, res, 'missing_hash');

        const agent = await checkAgent(client_id);
        if (!agent) return sendError(req, res, 403, 'invalid_client_id');

        const expectedHash = hmac(`${client_id}:${code}:${user}`, agent.client_secret);
        if (hash !== expectedHash) return sendError(req, res, 403, 'invalid_hash');

        const codeRecord = await Code.findOne({ client_id, code });
        if (!codeRecord) return sendError(req, res, 401, 'code_not_found');
        if (codeRecord.exp < now()) {
            await Code.deleteOne({ client_id, code });
            return sendError(req, res, 401, 'code_expired');
        }

        codeRecord.user = user;
        await codeRecord.save();

        await ensureUser(user);

        return sendSuccess(req, res, 'ok_code_assigned', { success: true });
    } catch (error) {
        console.error('assignCodeUser error:', error);
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.sendSms = async (req, res) => {
    try {
        const client_id = getClientId(req);
        const { hash, lang } = req.query;
        const { user, aud } = req.body;
        if (!client_id) return badRequest(req, res, 'missing_client_id_header');
        if (!user || !aud) return badRequest(req, res, 'missing_user_or_aud');
        if (!hash) return badRequest(req, res, 'missing_hash');

        const agent = await checkAgent(client_id);
        if (!agent) return sendError(req, res, 403, 'invalid_client_id');

        const expectedHash = hmac(`${client_id}:${user}:${aud}`, agent.client_secret);
        if (hash !== expectedHash) return sendError(req, res, 403, 'invalid_hash');

        const userRecord = await lookupUser(user);
        if (!userRecord) return sendError(req, res, 403, 'user_not_found');
        if (!userRecord.mobile) return sendError(req, res, 400, 'no_mobile_number_set');

        await Code.deleteMany({ client_id, user, aud });

        const pin = () => String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
        const result = await generateUnique('pin', pin, client_id, agent.pin_exp);
        if (!result) return sendError(req, res, 500, 'failed_generate_unique_pin');

        await Code.create({ client_id, pin: result.value, user, aud, exp: result.exp });

        const smsSent = await sendSmsToUser(userRecord.mobile, result.value, lang);
        if (!smsSent) {
            await Code.deleteOne({ client_id, pin: result.value });
            return sendError(req, res, 500, 'failed_send_sms');
        }

        return sendSuccess(req, res, 'ok_sms_sent', { success: true });
    } catch (error) {
        console.error('sendSms error:', error);
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.issueTokens = async (req, res) => {
    try {
        const client_id = getClientId(req);
        const { hash } = req.query;
        const { grant, code, pin } = req.body;
        if (!client_id) return badRequest(req, res, 'missing_client_id_header');
        if (!hash) return badRequest(req, res, 'missing_hash');
        if (!/^[a-f0-9]{64}$/i.test(String(hash))) return badRequest(req, res, 'invalid_hash_format');

        const normalizedGrant = normalizeGrant(grant);
        if (!['code', 'sms'].includes(normalizedGrant)) {
            return badRequest(req, res, 'invalid_grant_expected_code_or_sms');
        }

        const credential = normalizedGrant === 'code' ? code : pin;
        if (!credential) return badRequest(req, res, 'missing_code_or_pin');
        if (normalizedGrant === 'code' && !/^[a-f0-9]{32}$/i.test(String(credential))) {
            return badRequest(req, res, 'invalid_code_format');
        }
        if (normalizedGrant === 'sms' && !/^\d{6}$/.test(String(credential))) {
            return badRequest(req, res, 'invalid_pin_format');
        }

        const agent = await checkAgent(client_id);
        if (!agent) return sendError(req, res, 403, 'invalid_client_id');

        const expectedHash = hmac(`${client_id}:${credential}`, agent.client_secret);
        if (hash !== expectedHash) return sendError(req, res, 403, 'invalid_hash');

        const query = normalizedGrant === 'code' ? { client_id, code } : { client_id, pin };
        const codeRecord = await Code.findOne(query);

        if (!codeRecord) return sendError(req, res, 401, 'invalid_code_or_pin');
        if (codeRecord.exp < now()) {
            await Code.deleteOne(query);
            return sendError(req, res, 401, 'code_expired');
        }
        if (!codeRecord.user) {
            return sendError(req, res, 401, 'code_not_linked_to_user');
        }

        await Code.deleteOne(query);

        const { user, aud } = codeRecord;
        const scopes = agent.scopes || '';
        const userRecord = await ensureUser(user);
        const familyId = randomHex(16); // Create refresh family ID

        let accessToken;
        let refreshToken;
        try {
            ({ accessToken, refreshToken } = createTokenPair(agent, user, aud, scopes, familyId));
        } catch (e) {
            return sendError(req, res, 500, 'failed_create_tokens');
        }

        await Token.deleteMany({ user, aud });

        const accessPayload = jwt.decode(accessToken);
        const refreshPayload = jwt.decode(refreshToken);
        const refreshHash = sha256Hash(refreshToken);

        await Token.insertMany([
            {
                jti: accessPayload.jti,
                type: 0,
                iat: accessPayload.iat,
                exp: accessPayload.exp,
                client_id,
                client_ref: agent._id || null,
                aud,
                user,
                user_id: userRecord ? userRecord._id : null,
                scopes,
            },
            {
                jti: refreshPayload.jti,
                type: 1,
                iat: refreshPayload.iat,
                exp: refreshPayload.exp,
                client_id,
                client_ref: agent._id || null,
                aud,
                user,
                user_id: userRecord ? userRecord._id : null,
                scopes,
                token_hash: refreshHash,         // Store refresh token hash
                family_id: familyId,             // Mark family
                parent_jti: null,                // First token in family
                ip_address: req.ip,              // Log IP for audit
                user_agent: req.get('user-agent'), // Log user-agent
            },
        ]);

        return sendSuccess(req, res, 'ok_tokens_issued', { access: accessToken, refresh: refreshToken });
    } catch (error) {
        console.error('issueTokens error:', error);
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return badRequest(req, res, 'missing_refresh_token');

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (e) {
            return sendError(req, res, 401, e.name === 'TokenExpiredError' ? 'token_expired' : 'invalid_token');
        }

        // Hash-based validation: compare token hash with DB
        const tokenHash = sha256Hash(token);
        const stored = await Token.findOne({ token_hash: tokenHash, type: 1, revoked: { $ne: true } });
        
        if (!stored) return sendError(req, res, 401, 'token_not_found_or_revoked');

        // AUD binding: ensure token is from expected device
        if (payload.aud !== stored.aud) {
            return sendError(req, res, 401, 'device_mismatch_token_revoked');
        }

        // CONCURRENT REUSE DETECTION: 5-second window
        const CONCURRENT_REUSE_WINDOW = 5000;
        if (stored.used_at) {
            const timeSinceFirstUse = Date.now() - stored.used_at.getTime();
            
            if (timeSinceFirstUse < CONCURRENT_REUSE_WINDOW) {
                // 🚨 COMPROMISE DETECTED: Same token used 2+ times within 5 seconds
                // Attacker + legitimate user both have the token
                // Revoke entire family immediately
                await Token.updateMany(
                    { family_id: stored.family_id },
                    {
                        reuse_detected: true,
                        revoked: true,
                        revoked_at: now(),
                        revoked_reason: 'concurrent_reuse_detected',
                        compromised_at: Date.now(),
                    }
                );
                
                console.warn(`[SECURITY] Refresh token reuse detected for user=${stored.user}, family=${stored.family_id}, aud=${stored.aud}`);
                return sendError(req, res, 401, 'token_compromised_reuse_detected');
            }
            
            // Token already used but not concurrent (normal already-spent scenario)
            return sendError(req, res, 401, 'token_already_used');
        }

        const agent = await checkAgent(stored.client_id);
        if (!agent) return sendError(req, res, 401, 'agent_not_found');

        const userRecord = stored.user_id ? null : await findUser(stored.user);
        
        const newFamilyId = stored.family_id; // Keep same family for rotation chain
        
        // Create new access + refresh token
        let accessToken;
        let refreshToken;
        try {
            // createTokenPair now includes family_id in refresh payload
            ({ accessToken, refreshToken } = createTokenPair(agent, stored.user, stored.aud, stored.scopes, newFamilyId));
        } catch (e) {
            return sendError(req, res, 500, 'failed_create_tokens');
        }

        // Mark old refresh as used/revoked
        await Token.updateOne(
            { token_hash: tokenHash },
            {
                used_at: Date.now(),
                revoked: true,
                revoked_at: now(),
                revoked_reason: 'rotated',
                last_activity_at: Date.now(),
                ip_address: req.ip,
                user_agent: req.get('user-agent'),
            }
        );

        // Store new access token
        const accessPayload = jwt.decode(accessToken);
        await Token.create({
            jti: accessPayload.jti,
            type: 0,
            iat: accessPayload.iat,
            exp: accessPayload.exp,
            client_id: stored.client_id,
            client_ref: stored.client_ref || agent._id || null,
            aud: stored.aud,
            user: stored.user,
            user_id: stored.user_id || (userRecord ? userRecord._id : null),
            scopes: stored.scopes,
        });

        // Store new refresh token with rotation chain
        const refreshPayload = jwt.decode(refreshToken);
        const newRefreshHash = sha256Hash(refreshToken);
        await Token.create({
            jti: refreshPayload.jti,
            type: 1,
            iat: refreshPayload.iat,
            exp: refreshPayload.exp,
            client_id: stored.client_id,
            client_ref: stored.client_ref || agent._id || null,
            aud: stored.aud,
            user: stored.user,
            user_id: stored.user_id || (userRecord ? userRecord._id : null),
            scopes: stored.scopes,
            token_hash: newRefreshHash,       // New hash for next rotation
            family_id: newFamilyId,           // Same family
            parent_jti: payload.jti,          // Link to old refresh  
            ip_address: req.ip,               // Log IP
            user_agent: req.get('user-agent'), // Log user-agent
        });

        // Return both access + refresh (rotation response)
        return sendSuccess(req, res, 'ok_tokens_issued', { access: accessToken, refresh: refreshToken });
    } catch (error) {
        console.error('refreshToken error:', error);
        return sendError(req, res, 500, 'internal_server_error');
    }
};

function buildJti(client_id, user, aud, scopes, secret) {
    return hmac(`${client_id}${user}${aud}${scopes}`, secret);
}

function createAccessToken(agent, user, aud, scopes) {
    const iat = now();
    const exp = iat + agent.access_exp;
    const jti = buildJti(agent.client_id, user, aud, scopes, agent.client_secret);
    return jwt.sign({ jti, iat, exp, aud, scopes, user }, process.env.JWT_SECRET, { algorithm: 'HS256' });
}

function createTokenPair(agent, user, aud, scopes, familyId) {
    const rIat = now();
    const rExp = rIat + agent.refresh_exp;
    const rJti = buildJti(agent.client_id, user, aud, scopes + '_refresh', agent.client_secret);

    const accessToken = createAccessToken(agent, user, aud, scopes);
    const refreshToken = jwt.sign(
        { jti: rJti, iat: rIat, exp: rExp, aud, scopes, user, family_id: familyId },
        process.env.JWT_SECRET,
        { algorithm: 'HS256' }
    );

    return { accessToken, refreshToken };
}

async function lookupUser(username) {
    const existing = await findUser(username);
    if (existing) return existing;

    if (process.env.ALLOW_MOCK_USERS !== 'true') return null;

    return ensureUser(username, { mobile: '6900000000' });
}

async function findUser(username) {
    return User.findOne({ username });
}

async function ensureUser(username, extra = {}) {
    if (!username) return null;

    const payload = {
        username,
        ...extra,
    };

    return User.findOneAndUpdate(
        { username },
        { $setOnInsert: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

async function sendSmsToUser(mobile, pin, lang) {
    // TODO: Replace with real SMS provider
    console.log(`[SMS] PIN ${pin} to ${mobile}, lang=${lang || 'EN'}`);
    return true;
}
