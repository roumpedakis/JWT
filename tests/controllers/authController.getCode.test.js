const crypto = require('crypto');
const { mockReq, mockRes } = require('../helpers/httpMocks');

jest.mock('../../src/models/Agent', () => ({ findOne: jest.fn() }));
jest.mock('../../src/models/Code', () => ({ findOne: jest.fn(), deleteOne: jest.fn(), create: jest.fn() }));
jest.mock('../../src/models/Token', () => ({ findOne: jest.fn(), deleteMany: jest.fn(), insertMany: jest.fn(), create: jest.fn() }));

const Agent = require('../../src/models/Agent');
const Code = require('../../src/models/Code');
const controller = require('../../src/controllers/authController');

function hmac(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

describe('GET /auth/code', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.LOGIN_URL = '/auth/login';
    });

    test('returns 400 when client_id missing', async () => {
        const req = mockReq({ query: { aud: 'dev1', hash: 'x' } });
        const res = mockRes();

        await controller.getCode(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe('E400001');
    });

    test('returns 403 when hash invalid', async () => {
        Agent.findOne.mockResolvedValue({ client_secret: 'secret', code_exp: 300 });
        const req = mockReq({ headers: { client_id: 'clnt0001' }, query: { aud: 'dev1', hash: 'bad' } });
        const res = mockRes();

        await controller.getCode(req, res);

        expect(res.statusCode).toBe(403);
        expect(res.body.code).toBe('E403002');
    });

    test('returns 500 when unique code generation fails after retries', async () => {
        Agent.findOne.mockResolvedValue({ client_secret: 'secret', code_exp: 300 });
        Code.findOne.mockResolvedValue({ exp: Math.floor(Date.now() / 1000) + 9999 });

        const hash = hmac('clnt0001:dev1', 'secret');
        const req = mockReq({ headers: { client_id: 'clnt0001' }, query: { aud: 'dev1', hash } });
        const res = mockRes();

        await controller.getCode(req, res);

        expect(res.statusCode).toBe(500);
        expect(res.body.code).toBe('E500001');
        expect(Code.findOne).toHaveBeenCalledTimes(10);
    });

    test('returns 200 and auth_code on success (EN)', async () => {
        Agent.findOne.mockResolvedValue({ client_secret: 'secret', code_exp: 300 });
        Code.findOne.mockResolvedValue(null);
        Code.create.mockResolvedValue({});

        const hash = hmac('clnt0001:dev1', 'secret');
        const req = mockReq({
            headers: { client_id: 'clnt0001' },
            query: { aud: 'dev1', hash, lang: 'EN' },
        });
        const res = mockRes();

        await controller.getCode(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe('S200001');
        expect(res.body.message).toContain('Code');
        expect(res.body.auth_code).toHaveLength(32);
        expect(res.body.url).toContain('lang=EN');
        expect(Code.create).toHaveBeenCalled();
    });
});
