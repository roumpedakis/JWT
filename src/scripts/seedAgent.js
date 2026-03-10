require('dotenv').config();
const connectDB = require('../config/db');
const Agent = require('../models/Agent');

if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
    console.error('seedAgent is disabled in production environments.');
    process.exit(1);
}

async function run() {
    await connectDB();

    const client_id = process.env.SEED_CLIENT_ID || 'clnt0001';
    const client_secret = process.env.SEED_CLIENT_SECRET || 'clientsecret0001';

    const payload = {
        name: 'Default Agent',
        client_id,
        client_secret,
        scopes: 'invoice/read invoice/write',
        code_exp: 300,
        pin_exp: 300,
        access_exp: 900,
        refresh_exp: 604800,
    };

    await Agent.findOneAndUpdate(
        { client_id: payload.client_id },
        payload,
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('Agent seeded:', { client_id, client_secret });
    process.exit(0);
}

run().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
