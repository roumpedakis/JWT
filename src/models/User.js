const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    mobile: { type: String, default: null, trim: true },
    is_active: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ is_active: 1, createdAt: -1 });
userSchema.index({ mobile: 1 });

module.exports = mongoose.model('User', userSchema);
