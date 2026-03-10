const { mockReq, mockRes } = require('../helpers/httpMocks');

jest.mock('../../src/models/Code', () => ({
    find: jest.fn(),
    deleteMany: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
}));

jest.mock('../../src/models/Token', () => ({
    find: jest.fn(),
    deleteMany: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
}));

jest.mock('../../src/models/Agent', () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
}));

const Code = require('../../src/models/Code');
const Token = require('../../src/models/Token');
const User = require('../../src/models/User');
const Agent = require('../../src/models/Agent');
const adminController = require('../../src/controllers/adminController');

describe('adminController', () => {
    beforeEach(() => jest.clearAllMocks());

    test('getCodes success', async () => {
        Code.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: '1' }]) }) });
        const req = mockReq({ query: { client_id: 'c1', lang: 'EN' } });
        const res = mockRes();

        await adminController.getCodes(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe('S200006');
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('updateCode not found', async () => {
        Code.findByIdAndUpdate.mockResolvedValue(null);
        const req = mockReq({ params: { id: 'x' }, body: {} });
        req.params = { id: 'x' };
        const res = mockRes();

        await adminController.updateCode(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.errors[0].code).toBe('E401011');
    });

    test('revokeToken success', async () => {
        Token.findByIdAndUpdate.mockResolvedValue({ _id: 't1', revoked: true });
        const req = mockReq();
        req.params = { id: 't1' };
        const res = mockRes();

        await adminController.revokeToken(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe('S200011');
        expect(res.body.data.revoked).toBe(true);
    });

    test('deleteToken not found', async () => {
        Token.findByIdAndDelete.mockResolvedValue(null);
        const req = mockReq();
        req.params = { id: 'z' };
        const res = mockRes();

        await adminController.deleteToken(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.errors[0].code).toBe('E401006');
    });

    test('getUsers success', async () => {
        User.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: 'u1' }]) }) });
        const req = mockReq({ query: { lang: 'EN' } });
        const res = mockRes();

        await adminController.getUsers(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe('S200013');
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('createUser conflict', async () => {
        User.findOne.mockResolvedValue({ _id: 'u1', username: 'user01' });
        const req = mockReq({ body: { username: 'user01' } });
        const res = mockRes();

        await adminController.createUser(req, res);

        expect(res.statusCode).toBe(409);
        expect(res.body.errors[0].code).toBe('E409001');
    });

    test('getClients success', async () => {
        Agent.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: 'c1' }]) }) });
        const req = mockReq({ query: {} });
        const res = mockRes();

        await adminController.getClients(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe('S200017');
    });

    test('createClient missing fields', async () => {
        const req = mockReq({ body: { name: 'x' } });
        const res = mockRes();

        await adminController.createClient(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body.errors[0].code).toBe('E400012');
    });
});
