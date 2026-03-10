const { mockReq, mockRes } = require('../helpers/httpMocks');

jest.mock('../../src/models/Code', () => ({
    find: jest.fn(),
    countDocuments: jest.fn(),
    deleteMany: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
}));

jest.mock('../../src/models/Token', () => ({
    find: jest.fn(),
    countDocuments: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
}));

jest.mock('../../src/models/Agent', () => ({
    find: jest.fn(),
    countDocuments: jest.fn(),
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

function listChain(data) {
    return {
        sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(data),
                }),
            }),
        }),
    };
}

describe('adminController', () => {
    beforeEach(() => jest.clearAllMocks());

    test('getCodes success', async () => {
        Code.find.mockReturnValue(listChain([{ _id: '1' }]));
        Code.countDocuments.mockResolvedValue(1);
        const req = mockReq({ query: { client_id: 'c1', lang: 'EN' } });
        const res = mockRes();

        await adminController.getCodes(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe('S200006');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.meta.total).toBe(1);
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
        User.find.mockReturnValue(listChain([{ _id: 'u1' }]));
        User.countDocuments.mockResolvedValue(1);
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

    test('logoutUserDevice success', async () => {
        User.findOne.mockResolvedValue({ _id: 'u1', username: 'user01' });
        Token.updateMany.mockResolvedValue({ modifiedCount: 2 });
        const req = mockReq({ query: { aud: 'device-1', lang: 'EN' } });
        req.params = { id: 'u1' };
        const res = mockRes();

        await adminController.logoutUserDevice(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe('S200021');
        expect(res.body.data.aud).toBe('device-1');
        expect(res.body.data.revoked_count).toBe(2);
        expect(Token.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ aud: 'device-1' }),
            expect.objectContaining({ revoked: true, revoked_reason: 'admin_logout_device' })
        );
    });

    test('logoutAllUserDevices returns 404 when user missing', async () => {
        User.findOne.mockResolvedValue(null);
        const req = mockReq({ query: { lang: 'EN' } });
        req.params = { id: 'missing-user' };
        const res = mockRes();

        await adminController.logoutAllUserDevices(req, res);

        expect(res.statusCode).toBe(404);
        expect(res.body.errors[0].code).toBe('E404001');
    });

    test('logoutAllUserDevices success', async () => {
        User.findOne.mockResolvedValue({ _id: 'u1', username: 'user01' });
        Token.updateMany.mockResolvedValue({ modifiedCount: 4 });
        const req = mockReq({ query: { lang: 'EN' } });
        req.params = { id: 'u1' };
        const res = mockRes();

        await adminController.logoutAllUserDevices(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe('S200022');
        expect(res.body.data.revoked_count).toBe(4);
        expect(Token.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ revoked: { $ne: true } }),
            expect.objectContaining({ revoked: true, revoked_reason: 'admin_logout_all_devices' })
        );
    });

    test('getClients success', async () => {
        Agent.find.mockReturnValue(listChain([{ _id: 'c1' }]));
        Agent.countDocuments.mockResolvedValue(1);
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
