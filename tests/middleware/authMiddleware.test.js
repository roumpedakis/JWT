const jwt = require('jsonwebtoken');
const { mockReq, mockRes } = require('../helpers/httpMocks');

jest.mock('../../src/models/Token', () => ({ findOne: jest.fn() }));

const Token = require('../../src/models/Token');
const authMiddlewareFactory = require('../../src/middleware/authMiddleware');

describe('authMiddleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'jwt-secret';
    });

    test('returns 401 when authorization header missing', async () => {
        const req = mockReq();
        const res = mockRes();
        const next = jest.fn();

        await authMiddlewareFactory('invoice/read')(req, res, next);

        expect(res.statusCode).toBe(401);
        expect(res.body.code).toBe('E401008');
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when token invalid', async () => {
        const req = mockReq({ headers: { authorization: 'Bearer bad' } });
        const res = mockRes();
        const next = jest.fn();

        await authMiddlewareFactory('invoice/read')(req, res, next);

        expect(res.statusCode).toBe(401);
        expect(res.body.code).toBe('E401004');
    });

    test('returns 401 when scope is insufficient', async () => {
        const token = jwt.sign({ jti: 'a1', user: 'u1', aud: 'd1', scopes: 'invoice/write' }, process.env.JWT_SECRET);
        const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
        const res = mockRes();
        const next = jest.fn();

        await authMiddlewareFactory('invoice/read')(req, res, next);

        expect(res.statusCode).toBe(401);
        expect(res.body.code).toBe('E401009');
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when token revoked/missing in db', async () => {
        const token = jwt.sign({ jti: 'a1', user: 'u1', aud: 'd1', scopes: 'invoice/read' }, process.env.JWT_SECRET);
        Token.findOne.mockResolvedValue(null);

        const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
        const res = mockRes();
        const next = jest.fn();

        await authMiddlewareFactory('invoice/read')(req, res, next);

        expect(res.statusCode).toBe(401);
        expect(res.body.code).toBe('E401010');
        expect(next).not.toHaveBeenCalled();
    });

    test('calls next and attaches req.auth on success', async () => {
        const token = jwt.sign({ jti: 'a1', user: 'u1', aud: 'd1', scopes: 'invoice/read' }, process.env.JWT_SECRET);
        Token.findOne.mockResolvedValue({ client_id: 'clnt0001' });

        const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
        const res = mockRes();
        const next = jest.fn();

        await authMiddlewareFactory('invoice/read')(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.auth).toEqual({
            user: 'u1',
            aud: 'd1',
            scopes: 'invoice/read',
            client_id: 'clnt0001',
        });
    });
});
