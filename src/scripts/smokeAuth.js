const crypto = require('crypto');
const http = require('http');

if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
    console.error('smokeAuth is disabled in production environments.');
    process.exit(1);
}

const base = process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || 80}`;
const client_id = process.env.SEED_CLIENT_ID || 'clnt0001';
const client_secret = process.env.SEED_CLIENT_SECRET || 'clientsecret0001';
const aud = process.env.SMOKE_AUD || 'device-smoke';
const user = process.env.SMOKE_USER || 'user01';

function hmac(data) {
    return crypto.createHmac('sha256', client_secret).update(data).digest('hex');
}

async function req(path, options = {}) {
    const method = options.method || 'GET';
    const headers = options.headers || {};
    const body = options.body || null;

    return new Promise((resolve, reject) => {
        const req = http.request(
            `${base}${path}`,
            { method, headers },
            (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    let json;
                    try {
                        json = JSON.parse(data);
                    } catch (e) {
                        json = { raw: data };
                    }
                    resolve({ status: res.statusCode, body: json });
                });
            }
        );

        req.on('error', reject);

        if (body) req.write(body);
        req.end();
    });
}

async function run() {
    const codeHash = hmac(`${client_id}:${aud}`);
    const codeRes = await req(`/auth/code?aud=${encodeURIComponent(aud)}&hash=${codeHash}&lang=EN`, {
        method: 'GET',
        headers: { client_id },
    });
    console.log('GET /auth/code =>', codeRes.status, codeRes.body);
    if (codeRes.status !== 200) process.exit(1);

    const code = codeRes.body.auth_code;
    const assignHash = hmac(`${client_id}:${code}:${user}`);
    const assignRes = await req(`/auth/code/assign?hash=${assignHash}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', client_id },
        body: JSON.stringify({ code, user }),
    });
    console.log('POST /auth/code/assign =>', assignRes.status, assignRes.body);
    if (assignRes.status !== 200) process.exit(1);

    const tokenHash = hmac(`${client_id}:${code}`);
    const tokenRes = await req(`/auth/token?hash=${tokenHash}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', client_id },
        body: JSON.stringify({ grant: 'code', code }),
    });
    console.log('POST /auth/token =>', tokenRes.status, tokenRes.body && Object.keys(tokenRes.body));
    if (tokenRes.status !== 200) process.exit(1);

    const refresh = tokenRes.body.refresh;
    const refreshRes = await req('/auth/token/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: refresh }),
    });
    console.log('POST /auth/token/refresh =>', refreshRes.status, refreshRes.body && Object.keys(refreshRes.body));
    if (refreshRes.status !== 200) process.exit(1);

    console.log('SMOKE_OK');
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
