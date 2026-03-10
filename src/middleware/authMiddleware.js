const jwt = require('jsonwebtoken');
const Token = require('../models/Token');

const now = () => Math.floor(Date.now() / 1000);

module.exports = (requiredScope) => async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing access token' });
    }

    const token = authHeader.split(' ')[1];

    // 1. Έλεγχος εγκυρότητας & λήξης
    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        return res.status(401).json({ error: e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' });
    }

    // 2. Έλεγχος scope
    if (requiredScope) {
        const scopes = (payload.scopes || '').split(' ');
        if (!scopes.includes(requiredScope)) {
            return res.status(401).json({ error: 'Insufficient scope' });
        }
    }

    // 3. Έλεγχος ύπαρξης στη DB
    const stored = await Token.findOne({ jti: payload.jti, type: 0 });
    if (!stored) return res.status(401).json({ error: 'Token not found or revoked' });

    // 4. Attach στο request
    req.auth = {
        user: payload.user,
        aud: payload.aud,
        scopes: payload.scopes,
        client_id: stored.client_id,
    };

    next();
};
