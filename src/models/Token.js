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
    
    // Refresh token rotation fields
    token_hash: { type: String, default: null },  // SHA-256(refresh_token) for comparaison, only for type=1
    family_id:  { type: String, default: null },  // Links refresh tokens in same rotation family
    parent_jti: { type: String, default: null },  // JTI of previous refresh (parent token)
    used_at:    { type: Date, default: null },    // When this refresh was used to get new tokens
    reuse_detected: { type: Boolean, default: false }, // True if concurrent reuse attempt detected
    revoked_reason: { type: String, default: null },  // Why revoked (e.g., 'concurrent_reuse_detected')
    compromised_at: { type: Date, default: null },    // When compromise was detected
    
    // Audit fields
    ip_address: { type: String, default: null },  // IP address when token was used
    user_agent: { type: String, default: null },  // User-Agent when token was used
    last_activity_at: { type: Date, default: null }, // Last activity timestamp
});

tokenSchema.index({ user: 1, aud: 1, type: 1 });
tokenSchema.index({ jti: 1, type: 1 }, { unique: true });
tokenSchema.index({ user_id: 1, type: 1, revoked: 1 });
tokenSchema.index({ client_ref: 1, type: 1, revoked: 1 });
tokenSchema.index({ client_id: 1, revoked: 1, type: 1 });
// Refresh rotation indexes
tokenSchema.index({ token_hash: 1, type: 1 });      // For refresh token hash lookup
tokenSchema.index({ family_id: 1 });                // For revoking entire family
tokenSchema.index({ user_id: 1, family_id: 1 });   // For finding all families for a user

module.exports = mongoose.model('Token', tokenSchema);
