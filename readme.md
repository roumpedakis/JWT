# JWT Authentication API

API αυθεντικοποιησης με JWT (access/refresh), HMAC request validation και admin endpoints.

## Stack
- Node.js
- Express
- MongoDB + Mongoose
- JSON Web Token
- Jest

## Setup
1. Εγκατασταση dependencies:
```bash
npm install
```
2. Συμπληρωσε το `.env` (δες `.env.example`).
3. Προαιρετικα seed για default agent:
```bash
npm run seed:agent
```
4. Εκκινηση:
```bash
npm start
```

## Environment Variables
- `PORT=80`
- `MONGO_URI=...`
- `JWT_SECRET=...`
- `LOGIN_URL=http://localhost/auth/login`
- `ALLOW_MOCK_USERS=true`
- `SEED_CLIENT_ID=clnt0001`
- `SEED_CLIENT_SECRET=clientsecret0001`
- `ADMIN_USER=admin`
- `ADMIN_PASS=admin123`

## Response Contract

### Success
```json
{
  "code": "S...",
  "...data": "...",
  "message": "..."
}
```

Rules:
- `code` παντα πρωτο πεδιο
- `message` παντα τελευταιο πεδιο

### Error
```json
{
  "errors": [
    {
      "code": "E...",
      "message": "..."
    }
  ]
}
```

## Auth Endpoints

### `GET /auth/code`
Headers:
- `client_id`

Query:
- `aud`
- `hash = HMAC_SHA256("{client_id}:{aud}", client_secret)`
- `lang=EL|EN` (optional)

Success:
```json
{
  "code": "S200001",
  "auth_code": "...",
  "url": "...",
  "message": "..."
}
```

### `POST /auth/code/assign`
Headers:
- `client_id`

Query:
- `hash = HMAC_SHA256("{client_id}:{code}:{user}", client_secret)`
- `lang=EL|EN` (optional)

Body:
```json
{
  "code": "...",
  "user": "..."
}
```

### `POST /auth/sms`
Headers:
- `client_id`

Query:
- `hash = HMAC_SHA256("{client_id}:{user}:{aud}", client_secret)`
- `lang=EL|EN` (optional)

Body:
```json
{
  "user": "...",
  "aud": "..."
}
```

### `POST /auth/token`
Headers:
- `client_id`

Query:
- `hash = HMAC_SHA256("{client_id}:{code_or_pin}", client_secret)`
- `lang=EL|EN` (optional)

Body:
```json
{
  "grant": "code | sms",
  "code": "...",
  "pin": "..."
}
```

Success:
```json
{
  "code": "S200004",
  "access": "...",
  "refresh": "...",
  "message": "..."
}
```

### `POST /auth/token/refresh`
Body:
```json
{
  "token": "{refresh_token}"
}
```

Success:
```json
{
  "code": "S200005",
  "access": "...",
  "message": "..."
}
```

## Admin Endpoints (Basic Auth)
Ολα τα `/admin/*` endpoints απαιτουν:
- `Authorization: Basic base64(ADMIN_USER:ADMIN_PASS)`

### Codes
- `GET /admin/codes`
- `PUT /admin/codes/:id`
- `DELETE /admin/codes/:id`

### Tokens
- `GET /admin/tokens`
- `PUT /admin/tokens/:id`
- `PATCH /admin/tokens/:id/revoke`
- `DELETE /admin/tokens/:id`

Σημειωση:
- Revoked tokens (`revoked=true`) δεν γινονται δεκτα απο auth middleware και refresh.

## Tests
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

## Postman
Υπαρχουν ετοιμα αρχεια:
- `postman/jwt-auth.postman_collection.json`
- `postman/jwt-auth.postman_environment.json`

Η collection περιλαμβανει auth flow, error case και admin requests.
