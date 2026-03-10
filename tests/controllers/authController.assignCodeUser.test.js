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

describe('POST /auth/code/assign', () => {
    beforeEach(() => jest.clearAllMocks());

    test('returns 400 when code/user missing', async () => {
        const req = mockReq({ headers: { client_id: 'clnt0001' }, query: { hash: 'x' }, body: {} });
        const res = mockRes();

        await controller.assignCodeUser(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body.error.code).toBe('E400004');
    });

    test('returns 401 when code not found', async () => {
        Agent.findOne.mockResolvedValue({ client_secret: 'secret' });
        Code.findOne.mockResolvedValue(null);
        const hash = hmac('clnt0001:abc:user01', 'secret');

        const req = mockReq({
            headers: { client_id: 'clnt0001' },
            query: { hash },
            body: { code: 'abc', user: 'user01' },
        });
        const res = mockRes();

        await controller.assignCodeUser(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.error.code).toBe('E401011');
    });

    test('returns 401 when code expired', async () => {
        Agent.findOne.mockResolvedValue({ client_secret: 'secret' });
        Code.findOne.mockResolvedValue({ exp: Math.floor(Date.now() / 1000) - 1 });
        const hash = hmac('clnt0001:abc:user01', 'secret');

        const req = mockReq({
            headers: { client_id: 'clnt0001' },
            query: { hash },
            body: { code: 'abc', user: 'user01' },
        });
        const res = mockRes();

        await controller.assignCodeUser(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.error.code).toBe('E401002');
        expect(Code.deleteOne).toHaveBeenCalledWith({ client_id: 'clnt0001', code: 'abc' });
    });

    test('returns 200 on success', async () => {
        Agent.findOne.mockResolvedValue({ client_secret: 'secret' });
        const save = jest.fn().mockResolvedValue({});
        Code.findOne.mockResolvedValue({ exp: Math.floor(Date.now() / 1000) + 60, save, user: null });
        const hash = hmac('clnt0001:abc:user01', 'secret');

        const req = mockReq({
            headers: { client_id: 'clnt0001' },
            query: { hash },
            body: { code: 'abc', user: 'user01' },
        });
        const res = mockRes();

        await controller.assignCodeUser(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe('S200002');
        expect(res.body.success).toBe(true);
        expect(save).toHaveBeenCalled();
    });
});
