const mongoose = require('mongoose');

const codeSchema = new mongoose.Schema({
    client_id:  { type: String, required: true },
    code:       { type: String, default: null },   // HEX 32 — για grant=code
    pin:        { type: String, default: null },   // 6-ψήφιο — για grant=SMS
    user:       { type: String, default: null },   // συμπληρώνεται μετά login
    aud:        { type: String, required: true },  // device id
    exp:        { type: Number, required: true },  // unix timestamp
});

// Σύνθετο index για αναζητήσεις
codeSchema.index({ client_id: 1, aud: 1 });
codeSchema.index({ client_id: 1, code: 1 });
codeSchema.index({ client_id: 1, pin: 1 });

module.exports = mongoose.model('Code', codeSchema);
