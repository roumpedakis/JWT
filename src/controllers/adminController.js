const Code = require('../models/Code');
const Token = require('../models/Token');
const User = require('../models/User');
const Agent = require('../models/Agent');
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

exports.getUsers = async (req, res) => {
    try {
        const filter = {};
        ['username', 'mobile'].forEach((k) => {
            if (req.query[k] !== undefined && req.query[k] !== '') filter[k] = req.query[k];
        });
        if (req.query.is_active !== undefined && req.query.is_active !== '') {
            filter.is_active = String(req.query.is_active).toLowerCase() === 'true';
        }

        const rows = await User.find(filter).sort({ createdAt: -1 }).lean();
        return sendSuccess(req, res, 'ok_admin_users_listed', { data: rows });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.createUser = async (req, res) => {
    try {
        const { username, mobile, is_active } = req.body;
        if (!username) return sendError(req, res, 400, 'missing_username');

        const exists = await User.findOne({ username });
        if (exists) return sendError(req, res, 409, 'user_already_exists');

        const row = await User.create({
            username,
            mobile: mobile || null,
            is_active: is_active !== undefined ? !!is_active : true,
        });

        return sendSuccess(req, res, 'ok_admin_user_created', { data: row });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(req, res, 400, 'missing_id_param');

        const updates = {};
        ['username', 'mobile', 'is_active'].forEach((k) => {
            if (req.body[k] !== undefined) updates[k] = req.body[k];
        });

        const row = await User.findByIdAndUpdate(id, updates, { new: true });
        if (!row) return sendError(req, res, 404, 'user_not_found_admin');

        return sendSuccess(req, res, 'ok_admin_user_updated', { data: row });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(req, res, 400, 'missing_id_param');

        const row = await User.findByIdAndDelete(id);
        if (!row) return sendError(req, res, 404, 'user_not_found_admin');

        await Token.deleteMany({ $or: [{ user_id: id }, { user: row.username }] });

        return sendSuccess(req, res, 'ok_admin_user_deleted', { data: { id } });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.getClients = async (req, res) => {
    try {
        const filter = {};
        ['client_id', 'name'].forEach((k) => {
            if (req.query[k] !== undefined && req.query[k] !== '') filter[k] = req.query[k];
        });

        const rows = await Agent.find(filter).sort({ client_id: 1 }).lean();
        return sendSuccess(req, res, 'ok_admin_clients_listed', { data: rows });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.createClient = async (req, res) => {
    try {
        const { name, client_id, client_secret, scopes, code_exp, pin_exp, access_exp, refresh_exp } = req.body;
        if (!name || !client_id || !client_secret) {
            return sendError(req, res, 400, 'missing_client_fields');
        }

        const exists = await Agent.findOne({ client_id });
        if (exists) return sendError(req, res, 409, 'client_already_exists');

        const row = await Agent.create({
            name,
            client_id,
            client_secret,
            scopes: scopes || '',
            code_exp: code_exp !== undefined ? code_exp : 300,
            pin_exp: pin_exp !== undefined ? pin_exp : 300,
            access_exp: access_exp !== undefined ? access_exp : 900,
            refresh_exp: refresh_exp !== undefined ? refresh_exp : 604800,
        });

        return sendSuccess(req, res, 'ok_admin_client_created', { data: row });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(req, res, 400, 'missing_id_param');

        const updates = {};
        ['name', 'client_id', 'client_secret', 'scopes', 'code_exp', 'pin_exp', 'access_exp', 'refresh_exp'].forEach((k) => {
            if (req.body[k] !== undefined) updates[k] = req.body[k];
        });

        const row = await Agent.findByIdAndUpdate(id, updates, { new: true });
        if (!row) return sendError(req, res, 404, 'client_not_found');

        return sendSuccess(req, res, 'ok_admin_client_updated', { data: row });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return sendError(req, res, 400, 'missing_id_param');

        const row = await Agent.findByIdAndDelete(id);
        if (!row) return sendError(req, res, 404, 'client_not_found');

        await Promise.all([
            Code.deleteMany({ client_id: row.client_id }),
            Token.deleteMany({ $or: [{ client_ref: id }, { client_id: row.client_id }] }),
        ]);

        return sendSuccess(req, res, 'ok_admin_client_deleted', { data: { id } });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};
