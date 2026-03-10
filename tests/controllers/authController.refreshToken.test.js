const jwt = require('jsonwebtoken');
const { mockReq, mockRes } = require('../helpers/httpMocks');

jest.mock('../../src/models/Agent', () => ({ findOne: jest.fn() }));
jest.mock('../../src/models/Code', () => ({ findOne: jest.fn(), deleteOne: jest.fn(), create: jest.fn(), deleteMany: jest.fn() }));
jest.mock('../../src/models/Token', () => ({ findOne: jest.fn(), deleteMany: jest.fn(), insertMany: jest.fn(), create: jest.fn() }));

const Agent = require('../../src/models/Agent');
const Token = require('../../src/models/Token');
const controller = require('../../src/controllers/authController');

describe('POST /auth/token/refresh', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'jwt-secret';
    });

    test('returns 400 when refresh token missing', async () => {
        const req = mockReq({ body: {} });
        const res = mockRes();

        await controller.refreshToken(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body.errors[0].code).toBe('E400007');
    });

    test('returns 401 when refresh token invalid', async () => {
        const req = mockReq({ body: { token: 'bad-token' } });
        const res = mockRes();

        await controller.refreshToken(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.errors[0].code).toBe('E401004');
    });

    test('returns 401 when stored token not found', async () => {
        const token = jwt.sign({ jti: 'r1', user: 'u1', aud: 'd1' }, process.env.JWT_SECRET);
        Token.findOne.mockResolvedValue(null);

        const req = mockReq({ body: { token } });
        const res = mockRes();

        await controller.refreshToken(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.errors[0].code).toBe('E401006');
    });

    test('returns 200 with new access on success', async () => {
        const refresh = jwt.sign({ jti: 'r1', user: 'u1', aud: 'd1' }, process.env.JWT_SECRET);
        Token.findOne.mockResolvedValue({ jti: 'r1', type: 1, user: 'u1', aud: 'd1', client_id: 'clnt0001', scopes: 'invoice/read' });
        Agent.findOne.mockResolvedValue({ client_id: 'clnt0001', client_secret: 'secret', access_exp: 60 });
        Token.deleteMany.mockResolvedValue({});
        Token.create.mockResolvedValue({});

        const req = mockReq({ body: { token: refresh }, query: { lang: 'EN' } });
        const res = mockRes();

        await controller.refreshToken(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe('S200005');
        expect(typeof res.body.access).toBe('string');
    });
});
