const Dictionary = require('../utils/Dictionary');

function sendError(req, res, status, key) {
    const payload = Dictionary.get(key, Dictionary.fromRequest(req));
    return res.status(status).json({
        errors: [
            {
                code: payload.code,
                message: payload.message,
            },
        ],
    });
}

module.exports = (req, res, next) => {
    const auth = req.headers['authorization'] || '';
    if (!auth.startsWith('Basic ')) {
        return sendError(req, res, 403, 'admin_auth_required');
    }

    const encoded = auth.slice(6).trim();
    let decoded = '';
    try {
        decoded = Buffer.from(encoded, 'base64').toString('utf8');
    } catch (error) {
        return sendError(req, res, 403, 'admin_auth_invalid');
    }

    const idx = decoded.indexOf(':');
    if (idx < 0) return sendError(req, res, 403, 'admin_auth_invalid');

    const user = decoded.slice(0, idx);
    const pass = decoded.slice(idx + 1);

    const expectedUser = process.env.ADMIN_USER || 'admin';
    const expectedPass = process.env.ADMIN_PASS || 'admin123';

    if (user !== expectedUser || pass !== expectedPass) {
        return sendError(req, res, 403, 'admin_auth_invalid');
    }

    req.admin = { user };
    next();
};
