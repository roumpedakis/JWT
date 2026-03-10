const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    jti:        { type: String, required: true },  // hash_hmac sha256
    type:       { type: Number, required: true },  // 0=access, 1=refresh
    iat:        { type: Number, required: true },  // unix timestamp
    exp:        { type: Number, required: true },  // unix timestamp
    client_id:  { type: String, required: true },
    aud:        { type: String, required: true },  // device id
    user:       { type: String, required: true },
    scopes:     { type: String, required: true },  // π.χ. "invoice/all signature/write"
    revoked:    { type: Boolean, default: false },
    revoked_at: { type: Number, default: null },
});

tokenSchema.index({ user: 1, aud: 1, type: 1 });
tokenSchema.index({ jti: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Token', tokenSchema);
