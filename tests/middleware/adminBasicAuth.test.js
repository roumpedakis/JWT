const { mockReq, mockRes } = require('../helpers/httpMocks');
const adminBasicAuth = require('../../src/middleware/adminBasicAuth');

describe('adminBasicAuth middleware', () => {
    beforeEach(() => {
        process.env.ADMIN_USER = 'admin';
        process.env.ADMIN_PASS = 'admin123';
    });

    test('returns 403 when auth header missing', () => {
        const req = mockReq();
        const res = mockRes();
        const next = jest.fn();

        adminBasicAuth(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(res.body.errors[0].code).toBe('E403004');
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 403 when credentials invalid', () => {
        const bad = Buffer.from('admin:wrong').toString('base64');
        const req = mockReq({ headers: { authorization: `Basic ${bad}` } });
        const res = mockRes();
        const next = jest.fn();

        adminBasicAuth(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(res.body.errors[0].code).toBe('E403005');
        expect(next).not.toHaveBeenCalled();
    });

    test('calls next when credentials valid', () => {
        const good = Buffer.from('admin:admin123').toString('base64');
        const req = mockReq({ headers: { authorization: `Basic ${good}` } });
        const res = mockRes();
        const next = jest.fn();

        adminBasicAuth(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.admin.user).toBe('admin');
    });
});
