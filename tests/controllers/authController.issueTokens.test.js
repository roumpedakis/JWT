const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { mockReq, mockRes } = require('../helpers/httpMocks');

jest.mock('../../src/models/Agent', () => ({ findOne: jest.fn() }));
jest.mock('../../src/models/Code', () => ({ findOne: jest.fn(), deleteOne: jest.fn(), create: jest.fn(), deleteMany: jest.fn() }));
jest.mock('../../src/models/Token', () => ({ findOne: jest.fn(), deleteMany: jest.fn(), insertMany: jest.fn(), create: jest.fn() }));
jest.mock('../../src/models/User', () => ({ findOne: jest.fn(), findOneAndUpdate: jest.fn() }));

const Agent = require('../../src/models/Agent');
const Code = require('../../src/models/Code');
const Token = require('../../src/models/Token');
const User = require('../../src/models/User');
const controller = require('../../src/controllers/authController');

function hmac(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

describe('POST /auth/token', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'jwt-secret';
    });

    test('returns 400 when grant invalid', async () => {
        const req = mockReq({
            headers: { client_id: 'clnt0001' },
            query: { hash: 'a'.repeat(64) },
            body: { grant: 'foo' },
        });
        const res = mockRes();

        await controller.issueTokens(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body.errors[0].code).toBe('E400008');
    });

    test('returns 401 when code not linked to user', async () => {
        const code = 'a'.repeat(32);
        Agent.findOne.mockResolvedValue({ client_secret: 'secret', scopes: '', access_exp: 10, refresh_exp: 20, client_id: 'clnt0001' });
        Code.findOne.mockResolvedValue({ exp: Math.floor(Date.now() / 1000) + 100, user: null });
        const hash = hmac(`clnt0001:${code}`, 'secret');

        const req = mockReq({
            headers: { client_id: 'clnt0001' },
            query: { hash },
            body: { grant: 'code', code },
        });
        const res = mockRes();

        await controller.issueTokens(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.errors[0].code).toBe('E401003');
    });

    test('returns 200 and tokens on success', async () => {
        const code = 'b'.repeat(32);
        Agent.findOne.mockResolvedValue({
            _id: 'a1',
            client_id: 'clnt0001',
            client_secret: 'secret',
            scopes: 'invoice/read',
            access_exp: 100,
            refresh_exp: 200,
        });
        User.findOneAndUpdate.mockResolvedValue({ _id: 'u1', username: 'user01' });
        Code.findOne.mockResolvedValue({ exp: Math.floor(Date.now() / 1000) + 100, user: 'user01', aud: 'dev1' });
        Code.deleteOne.mockResolvedValue({});
        Token.deleteMany.mockResolvedValue({});
        Token.insertMany.mockResolvedValue({});

        const hash = hmac(`clnt0001:${code}`, 'secret');
        const req = mockReq({
            headers: { client_id: 'clnt0001' },
            query: { hash, lang: 'EN' },
            body: { grant: 'code', code },
        });
        const res = mockRes();

        await controller.issueTokens(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe('S200004');
        expect(typeof res.body.access).toBe('string');
        expect(typeof res.body.refresh).toBe('string');

        const accessPayload = jwt.decode(res.body.access);
        expect(accessPayload.user).toBe('user01');
        expect(Token.insertMany).toHaveBeenCalled();
        const insertArg = Token.insertMany.mock.calls[0][0][0];
        expect(insertArg.user_id).toBe('u1');
        expect(insertArg.client_ref).toBe('a1');
    });
});
