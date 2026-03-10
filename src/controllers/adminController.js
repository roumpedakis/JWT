const Code = require('../models/Code');
const Token = require('../models/Token');
const Dictionary = require('../utils/Dictionary');

const now = () => Math.floor(Date.now() / 1000);

function sendError(req, res, status, key, extra = {}) {
    const payload = Dictionary.get(key, Dictionary.fromRequest(req));
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

exports.getCodes = async (req, res) => {
    try {
        const filter = {};
        ['client_id', 'user', 'aud', 'code', 'pin'].forEach((k) => {
            if (req.query[k] !== undefined && req.query[k] !== '') filter[k] = req.query[k];
        });

        const rows = await Code.find(filter).sort({ exp: -1 }).lean();
        return sendSuccess(req, res, 'ok_admin_codes_listed', { data: rows });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.updateCode = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(req, res, 400, 'missing_id_param');

        const updates = {};
        ['client_id', 'code', 'pin', 'user', 'aud', 'exp'].forEach((k) => {
            if (req.body[k] !== undefined) updates[k] = req.body[k];
        });

        const row = await Code.findByIdAndUpdate(id, updates, { new: true });
        if (!row) return sendError(req, res, 401, 'code_not_found');

        return sendSuccess(req, res, 'ok_admin_code_updated', { data: row });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.deleteCode = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(req, res, 400, 'missing_id_param');

        const row = await Code.findByIdAndDelete(id);
        if (!row) return sendError(req, res, 401, 'code_not_found');

        return sendSuccess(req, res, 'ok_admin_code_deleted', { data: { id } });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.getTokens = async (req, res) => {
    try {
        const filter = {};
        ['jti', 'type', 'client_id', 'user', 'aud'].forEach((k) => {
            if (req.query[k] !== undefined && req.query[k] !== '') filter[k] = req.query[k];
        });
        if (req.query.revoked !== undefined && req.query.revoked !== '') {
            filter.revoked = String(req.query.revoked).toLowerCase() === 'true';
        }

        const rows = await Token.find(filter).sort({ iat: -1 }).lean();
        return sendSuccess(req, res, 'ok_admin_tokens_listed', { data: rows });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.updateToken = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(req, res, 400, 'missing_id_param');

        const updates = {};
        ['type', 'exp', 'client_id', 'aud', 'user', 'scopes'].forEach((k) => {
            if (req.body[k] !== undefined) updates[k] = req.body[k];
        });

        const row = await Token.findByIdAndUpdate(id, updates, { new: true });
        if (!row) return sendError(req, res, 401, 'token_not_found');

        return sendSuccess(req, res, 'ok_admin_token_updated', { data: row });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.revokeToken = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(req, res, 400, 'missing_id_param');

        const row = await Token.findByIdAndUpdate(
            id,
            { revoked: true, revoked_at: now() },
            { new: true }
        );
        if (!row) return sendError(req, res, 401, 'token_not_found');

        return sendSuccess(req, res, 'ok_admin_token_revoked', { data: row });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.deleteToken = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(req, res, 400, 'missing_id_param');

        const row = await Token.findByIdAndDelete(id);
        if (!row) return sendError(req, res, 401, 'token_not_found');

        return sendSuccess(req, res, 'ok_admin_token_deleted', { data: { id } });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};
