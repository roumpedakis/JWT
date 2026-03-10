const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    jti:        { type: String, required: true },  // hash_hmac sha256
    type:       { type: Number, required: true },  // 0=access, 1=refresh
    iat:        { type: Number, required: true },  // unix timestamp
    exp:        { type: Number, required: true },  // unix timestamp
    client_id:  { type: String, required: true },
    client_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },
    aud:        { type: String, required: true },  // device id
    user:       { type: String, required: true },
    user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    scopes:     { type: String, required: true },  // π.χ. "invoice/all signature/write"
    revoked:    { type: Boolean, default: false },
    revoked_at: { type: Number, default: null },
});

tokenSchema.index({ user: 1, aud: 1, type: 1 });
tokenSchema.index({ jti: 1, type: 1 }, { unique: true });
tokenSchema.index({ user_id: 1, type: 1, revoked: 1 });
tokenSchema.index({ client_ref: 1, type: 1, revoked: 1 });
tokenSchema.index({ client_id: 1, revoked: 1, type: 1 });

module.exports = mongoose.model('Token', tokenSchema);
