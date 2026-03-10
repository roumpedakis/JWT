const jwt = require('jsonwebtoken');
const Token = require('../models/Token');
const Dictionary = require('../utils/Dictionary');

const now = () => Math.floor(Date.now() / 1000);

module.exports = (requiredScope) => async (req, res, next) => {
    const lang = Dictionary.fromRequest(req);
    const err = (key) => {
        const payload = Dictionary.get(key, lang);
        return res.status(401).json({
            error: {
                code: payload.code,
                message: payload.message,
            },
        });
    };

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return err('missing_access_token');
    }

    const token = authHeader.split(' ')[1];

    // 1. Έλεγχος εγκυρότητας & λήξης
    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        return err(e.name === 'TokenExpiredError' ? 'token_expired' : 'invalid_token');
    }

    // 2. Έλεγχος scope
    if (requiredScope) {
        const scopes = (payload.scopes || '').split(' ');
        if (!scopes.includes(requiredScope)) {
            return err('insufficient_scope');
        }
    }

    // 3. Έλεγχος ύπαρξης στη DB
    const stored = await Token.findOne({ jti: payload.jti, type: 0 });
    if (!stored) return err('token_not_found_or_revoked');

    // 4. Attach στο request
    req.auth = {
        user: payload.user,
        aud: payload.aud,
        scopes: payload.scopes,
        client_id: stored.client_id,
    };

    next();
};
