const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
    name:           { type: String, maxlength: 20, required: true },
    client_id:      { type: String, length: 8, required: true, unique: true },
    client_secret:  { type: String, length: 16, required: true },
    code_exp:       { type: Number, required: true },  // seconds
    pin_exp:        { type: Number, required: true },  // seconds
    access_exp:     { type: Number, required: true },  // seconds
    refresh_exp:    { type: Number, required: true },  // seconds
});

module.exports = mongoose.model('Agent', agentSchema);
