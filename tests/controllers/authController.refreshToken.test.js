const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { mockReq, mockRes } = require('../helpers/httpMocks');

jest.mock('../../src/models/Agent', () => ({ findOne: jest.fn() }));
jest.mock('../../src/models/Code', () => ({ findOne: jest.fn(), deleteOne: jest.fn(), create: jest.fn(), deleteMany: jest.fn() }));
jest.mock('../../src/models/Token', () => ({
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteMany: jest.fn(),
    insertMany: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
}));
jest.mock('../../src/models/User', () => ({ findOne: jest.fn(), findOneAndUpdate: jest.fn() }));

const Agent = require('../../src/models/Agent');
const Token = require('../../src/models/Token');
const User = require('../../src/models/User');
const controller = require('../../src/controllers/authController');

function sha256Hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

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
        Token.findOneAndUpdate.mockResolvedValue(null);
        Token.findOne.mockResolvedValue(null);

        const req = mockReq({ body: { token } });
        const res = mockRes();

        await controller.refreshToken(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.errors[0].code).toBe('E401010'); // token_not_found_or_revoked
    });

    test('returns 200 with new tokens on success (rotation)', async () => {
        const token = jwt.sign({ jti: 'r1', user: 'u1', aud: 'd1', family_id: 'fam1' }, process.env.JWT_SECRET);
        Token.findOneAndUpdate.mockResolvedValue({
            _id: 'tid1',
            jti: 'r1',
            type: 1,
            user: 'u1',
            aud: 'd1',
            client_id: 'clnt0001',
            client_ref: 'a1',
            scopes: 'invoice/read',
            family_id: 'fam1',
            token_hash: sha256Hash(token),
            used_at: null,
        });
        User.findOne.mockResolvedValue({ _id: 'u1' });
        Agent.findOne.mockResolvedValue({ _id: 'a1', client_id: 'clnt0001', client_secret: 'secret', access_exp: 60, refresh_exp: 120 });
        Token.deleteMany.mockResolvedValue({});
        Token.create.mockResolvedValue({});

        const req = mockReq({ body: { token }, query: { lang: 'EN' } });
        const res = mockRes();

        await controller.refreshToken(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.code).toBe('S200004'); // ok_tokens_issued 
        expect(typeof res.body.access).toBe('string');
        expect(typeof res.body.refresh).toBe('string'); // NEW: refresh in rotation response

        expect(Token.findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ used_at: null, aud: 'd1' }),
            expect.objectContaining({
                $set: expect.objectContaining({
                    used_at: expect.any(Date),
                    revoked: true,
                    revoked_reason: 'rotated',
                }),
            }),
            { new: false }
        );

        expect(Token.deleteMany).toHaveBeenCalledWith({ user: 'u1', aud: 'd1', type: 0 });
        // Verify new tokens created
        expect(Token.create).toHaveBeenCalledTimes(2); // access + refresh
    });

    test('returns 401 when concurrent reuse detected', async () => {
        const token = jwt.sign({ jti: 'r1', user: 'u1', aud: 'd1', family_id: 'fam1' }, process.env.JWT_SECRET);
        const tokenHash = sha256Hash(token);
        const usedAWhileAgo = new Date(Date.now() - 1000); // 1 second ago

        Token.findOneAndUpdate.mockResolvedValue(null);
        Token.findOne.mockResolvedValue({
            _id: 'tid1',
            jti: 'r1',
            type: 1,
            user: 'u1',
            aud: 'd1',
            client_id: 'clnt0001',
            scopes: 'invoice/read',
            family_id: 'fam1',
            token_hash: tokenHash,
            used_at: usedAWhileAgo, // Already used within 5-second window
        });

        const req = mockReq({ body: { token } });
        const res = mockRes();

        await controller.refreshToken(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.errors[0].code).toBe('E401012'); // token_compromised_reuse_detected
        
        // Verify entire family revoked
        expect(Token.updateMany).toHaveBeenCalledWith(
            { family_id: 'fam1' },
            expect.objectContaining({
                reuse_detected: true,
                revoked: true,
                revoked_reason: 'concurrent_reuse_detected',
            })
        );
    });

    test('returns 401 when aud does not match', async () => {
        const token = jwt.sign({ jti: 'r1', user: 'u1', aud: 'd1', family_id: 'fam1' }, process.env.JWT_SECRET);
        const tokenHash = sha256Hash(token);

        Token.findOneAndUpdate.mockResolvedValue(null);
        Token.findOne.mockResolvedValue({
            _id: 'tid1',
            jti: 'r1',
            type: 1,
            user: 'u1',
            aud: 'd2', // Different device!
            client_id: 'clnt0001',
            scopes: 'invoice/read',
            family_id: 'fam1',
            token_hash: tokenHash,
            used_at: null,
        });

        const req = mockReq({ body: { token } });
        const res = mockRes();

        await controller.refreshToken(req, res);

        expect(res.statusCode).toBe(401);
        expect(res.body.errors[0].code).toBe('E401013'); // device_mismatch_token_revoked
        expect(Token.updateOne).toHaveBeenCalledWith(
            { _id: 'tid1' },
            expect.objectContaining({
                revoked: true,
                revoked_reason: 'device_mismatch',
            })
        );
    });
});
