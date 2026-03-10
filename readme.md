# JWT Authentication API

API αυθεντικοποιησης με JWT (access/refresh), HMAC request validation και admin endpoints.

Πλεον τα tokens συνδεονται και με:
- `user_id` (reference σε `users` collection)
- `client_ref` (reference σε `agents/clients` collection)

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

### Users
- `GET /admin/users`
- `POST /admin/users`
- `PUT /admin/users/:id`
- `DELETE /admin/users/:id`

Ενδεικτικο body για create/update user:
```json
{
  "username": "user01",
  "mobile": "6900000000",
  "is_active": true
}
```

### Clients
Στο admin τα `clients` αντιστοιχουν στο μοντελο `Agent`.

- `GET /admin/clients`
- `POST /admin/clients`
- `PUT /admin/clients/:id`
- `DELETE /admin/clients/:id`

Ενδεικτικο body για create/update client:
```json
{
  "name": "Default Agent",
  "client_id": "clnt0002",
  "client_secret": "clientsecret0002",
  "scopes": "invoice/read invoice/write",
  "code_exp": 300,
  "pin_exp": 300,
  "access_exp": 900,
  "refresh_exp": 604800
}
```

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

Η collection περιλαμβανει auth flow, error case και admin requests για codes/tokens/users/clients.
