require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const Dictionary = require('./utils/Dictionary');

const app = express();

app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);

// ─── Παράδειγμα protected route ───────────────────────────────────────────────
const authMiddleware = require('./middleware/authMiddleware');
app.post('/api/example', authMiddleware('invoice/read'), (req, res) => {
    res.json({ message: 'OK', user: req.auth.user });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err);
    const lang = Dictionary.fromRequest(req);
    const payload = Dictionary.get('internal_server_error', lang);
    res.status(500).json({ code: payload.code, error: payload.message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const start = async () => {
    await connectDB();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

start();

module.exports = app;
