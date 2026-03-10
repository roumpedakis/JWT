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

function parseBoolean(value) {
    if (value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return null;
}

function parsePagination(req) {
    const pageRaw = req.query.page;
    const limitRaw = req.query.limit;

    const page = pageRaw === undefined ? 1 : Number(pageRaw);
    const limit = limitRaw === undefined ? 20 : Number(limitRaw);

    if (!Number.isInteger(page) || !Number.isInteger(limit) || page < 1 || limit < 1 || limit > 200) {
        return null;
    }

    return { page, limit, skip: (page - 1) * limit };
}

function parseSort(req, allowed, fallback) {
    const sortBy = req.query.sort_by || fallback;
    const orderRaw = String(req.query.order || 'desc').toLowerCase();
    if (!allowed.includes(sortBy)) return null;
    if (!['asc', 'desc'].includes(orderRaw)) return null;
    return { sortBy, order: orderRaw, sortValue: orderRaw === 'asc' ? 1 : -1 };
}

function isPositiveInt(value) {
    return Number.isInteger(value) && value > 0;
}

function normalizeString(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function validateUserPayload(req, isCreate) {
    const username = normalizeString(req.body.username);
    const mobile = req.body.mobile;
    const isActive = req.body.is_active;

    if (isCreate && !username) return 'missing_username';

    if (username && !/^[a-zA-Z0-9._-]{3,50}$/.test(username)) {
        return 'invalid_username_format';
    }

    if (mobile !== undefined && mobile !== null && !/^\d{10,15}$/.test(String(mobile))) {
        return 'invalid_mobile_format';
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
        return 'invalid_is_active_type';
    }

    return null;
}

function validateClientPayload(req, isCreate) {
    const body = req.body || {};
    const name = normalizeString(body.name);
    const clientId = normalizeString(body.client_id);
    const clientSecret = normalizeString(body.client_secret);

    if (isCreate && (!name || !clientId || !clientSecret)) {
        return 'missing_client_fields';
    }

    if (clientId && !/^[a-zA-Z0-9]{8}$/.test(clientId)) return 'invalid_client_id_format';
    if (clientSecret && clientSecret.length !== 16) return 'invalid_client_secret_format';

    const expFields = ['code_exp', 'pin_exp', 'access_exp', 'refresh_exp'];
    for (const field of expFields) {
        if (body[field] !== undefined && !isPositiveInt(Number(body[field]))) {
            return 'invalid_exp_value';
        }
    }

    return null;
}

exports.getCodes = async (req, res) => {
    try {
        const pagination = parsePagination(req);
        if (!pagination) return sendError(req, res, 400, 'invalid_pagination_params');

        const sort = parseSort(req, ['exp', 'aud', 'client_id', 'user'], 'exp');
        if (!sort) return sendError(req, res, 400, 'invalid_sort_params');

        const filter = {};
        ['client_id', 'user', 'aud', 'code', 'pin'].forEach((k) => {
            if (req.query[k] !== undefined && req.query[k] !== '') filter[k] = req.query[k];
        });

        const [rows, total] = await Promise.all([
            Code.find(filter).sort({ [sort.sortBy]: sort.sortValue }).skip(pagination.skip).limit(pagination.limit).lean(),
            Code.countDocuments(filter),
        ]);

        return sendSuccess(req, res, 'ok_admin_codes_listed', {
            data: rows,
            meta: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                pages: Math.max(1, Math.ceil(total / pagination.limit)),
                sort_by: sort.sortBy,
                order: sort.order,
            },
        });
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
        const pagination = parsePagination(req);
        if (!pagination) return sendError(req, res, 400, 'invalid_pagination_params');

        const sort = parseSort(req, ['iat', 'exp', 'client_id', 'user'], 'iat');
        if (!sort) return sendError(req, res, 400, 'invalid_sort_params');

        const filter = {};
        ['jti', 'type', 'client_id', 'user', 'aud', 'user_id', 'client_ref'].forEach((k) => {
            if (req.query[k] !== undefined && req.query[k] !== '') filter[k] = req.query[k];
        });
        if (req.query.revoked !== undefined && req.query.revoked !== '') {
            const revoked = parseBoolean(req.query.revoked);
            if (revoked === null) return sendError(req, res, 400, 'invalid_boolean_filter');
            filter.revoked = revoked;
        }

        const [rows, total] = await Promise.all([
            Token.find(filter).sort({ [sort.sortBy]: sort.sortValue }).skip(pagination.skip).limit(pagination.limit).lean(),
            Token.countDocuments(filter),
        ]);

        return sendSuccess(req, res, 'ok_admin_tokens_listed', {
            data: rows,
            meta: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                pages: Math.max(1, Math.ceil(total / pagination.limit)),
                sort_by: sort.sortBy,
                order: sort.order,
            },
        });
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
        const pagination = parsePagination(req);
        if (!pagination) return sendError(req, res, 400, 'invalid_pagination_params');

        const sort = parseSort(req, ['createdAt', 'username', 'is_active'], 'createdAt');
        if (!sort) return sendError(req, res, 400, 'invalid_sort_params');

        const filter = {};
        ['username', 'mobile'].forEach((k) => {
            if (req.query[k] !== undefined && req.query[k] !== '') filter[k] = req.query[k];
        });
        if (req.query.is_active !== undefined && req.query.is_active !== '') {
            const isActive = parseBoolean(req.query.is_active);
            if (isActive === null) return sendError(req, res, 400, 'invalid_boolean_filter');
            filter.is_active = isActive;
        }

        const [rows, total] = await Promise.all([
            User.find(filter).sort({ [sort.sortBy]: sort.sortValue }).skip(pagination.skip).limit(pagination.limit).lean(),
            User.countDocuments(filter),
        ]);

        return sendSuccess(req, res, 'ok_admin_users_listed', {
            data: rows,
            meta: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                pages: Math.max(1, Math.ceil(total / pagination.limit)),
                sort_by: sort.sortBy,
                order: sort.order,
            },
        });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.createUser = async (req, res) => {
    try {
        const validationKey = validateUserPayload(req, true);
        if (validationKey) return sendError(req, res, 400, validationKey);

        const { username, mobile, is_active } = req.body;
        const normalizedUsername = normalizeString(username);

        const exists = await User.findOne({ username: normalizedUsername });
        if (exists) return sendError(req, res, 409, 'user_already_exists');

        const row = await User.create({
            username: normalizedUsername,
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

        const validationKey = validateUserPayload(req, false);
        if (validationKey) return sendError(req, res, 400, validationKey);

        const updates = {};
        ['username', 'mobile', 'is_active'].forEach((k) => {
            if (req.body[k] !== undefined) updates[k] = req.body[k];
        });
        if (updates.username !== undefined) updates.username = normalizeString(updates.username);

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
        const pagination = parsePagination(req);
        if (!pagination) return sendError(req, res, 400, 'invalid_pagination_params');

        const sort = parseSort(req, ['client_id', 'name', 'access_exp'], 'client_id');
        if (!sort) return sendError(req, res, 400, 'invalid_sort_params');

        const filter = {};
        ['client_id', 'name'].forEach((k) => {
            if (req.query[k] !== undefined && req.query[k] !== '') filter[k] = req.query[k];
        });

        const [rows, total] = await Promise.all([
            Agent.find(filter).sort({ [sort.sortBy]: sort.sortValue }).skip(pagination.skip).limit(pagination.limit).lean(),
            Agent.countDocuments(filter),
        ]);

        return sendSuccess(req, res, 'ok_admin_clients_listed', {
            data: rows,
            meta: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                pages: Math.max(1, Math.ceil(total / pagination.limit)),
                sort_by: sort.sortBy,
                order: sort.order,
            },
        });
    } catch (error) {
        return sendError(req, res, 500, 'internal_server_error');
    }
};

exports.createClient = async (req, res) => {
    try {
        const validationKey = validateClientPayload(req, true);
        if (validationKey) return sendError(req, res, 400, validationKey);

        const { name, client_id, client_secret, scopes, code_exp, pin_exp, access_exp, refresh_exp } = req.body;
        const normalizedClientId = normalizeString(client_id);
        const normalizedClientSecret = normalizeString(client_secret);

        const exists = await Agent.findOne({ client_id: normalizedClientId });
        if (exists) return sendError(req, res, 409, 'client_already_exists');

        const row = await Agent.create({
            name,
            client_id: normalizedClientId,
            client_secret: normalizedClientSecret,
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

        const validationKey = validateClientPayload(req, false);
        if (validationKey) return sendError(req, res, 400, validationKey);

        const updates = {};
        ['name', 'client_id', 'client_secret', 'scopes', 'code_exp', 'pin_exp', 'access_exp', 'refresh_exp'].forEach((k) => {
            if (req.body[k] !== undefined) updates[k] = req.body[k];
        });
        if (updates.client_id !== undefined) updates.client_id = normalizeString(updates.client_id);
        if (updates.client_secret !== undefined) updates.client_secret = normalizeString(updates.client_secret);

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
