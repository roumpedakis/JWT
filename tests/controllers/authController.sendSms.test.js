const crypto = require('crypto');
const { mockReq, mockRes } = require('../helpers/httpMocks');

jest.mock('../../src/models/Agent', () => ({ findOne: jest.fn() }));
jest.mock('../../src/models/Code', () => ({ findOne: jest.fn(), deleteOne: jest.fn(), create: jest.fn(), deleteMany: jest.fn() }));
jest.mock('../../src/models/Token', () => ({ findOne: jest.fn(), deleteMany: jest.fn(), insertMany: jest.fn(), create: jest.fn() }));

const Agent = require('../../src/models/Agent');
const Code = require('../../src/models/Code');
const controller = require('../../src/controllers/authController');

function hmac(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

describe('POST /auth/sms', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.ALLOW_MOCK_USERS = 'true';
    });

    test('returns 400 when user/aud missing', async () => {
        const req = mockReq({ headers: { client_id: 'clnt0001' }, query: { hash: 'x' }, body: {} });
        const res = mockRes();

        await controller.sendSms(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body.errors[0].code).toBe('E400005');
    });

    test('returns 403 when hash invalid', async () => {
        Agent.findOne.mockResolvedValue({ client_secret: 'secret', pin_exp: 300 });
        const req = mockReq({
            headers: { client_id: 'clnt0001' },
            query: { hash: 'bad' },
            body: { user: 'user01', aud: 'dev1' },
        });
        const res = mockRes();

        await controller.sendSms(req, res);

        expect(res.statusCode).toBe(403);
        expect(res.body.errors[0].code).toBe('E403002');
    });

    test('returns 403 when user not found (mock users disabled)', async () => {
        process.env.ALLOW_MOCK_USERS = 'false';
        Agent.findOne.mockResolvedValue({ client_secret: 'secret', pin_exp: 300 });
        const hash = hmac('clnt0001:user01:dev1', 'secret');
        const req = mockReq({
            headers: { client_id: 'clnt0001' },
            query: { hash },
            body: { user: 'user01', aud: 'dev1' },
        });
        const res = mockRes();

        await controller.sendSms(req, res);

        expect(res.statusCode).toBe(403);
        expect(res.body.errors[0].code).toBe('E403003');
    });

    test('returns 200 on success', async () => {
        Agent.findOne.mockResolvedValue({ client_secret: 'secret', pin_exp: 300 });
        Code.findOne.mockResolvedValue(null);
        Code.deleteMany.mockResolvedValue({});
        Code.create.mockResolvedValue({});

        const hash = hmac('clnt0001:user01:dev1', 'secret');
        const req = mockReq({
            headers: { client_id: 'clnt0001' },
            query: { hash, lang: 'EN' },
            body: { user: 'user01', aud: 'dev1' },
        });
        const res = mockRes();

        await controller.sendSms(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe('S200003');
        expect(res.body.success).toBe(true);
        expect(Code.create).toHaveBeenCalled();
    });
});
