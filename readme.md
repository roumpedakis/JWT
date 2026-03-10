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
5. Προαιρετικος γρηγορος ελεγχος end-to-end:
```bash
npm run smoke:auth
```

## Environment Variables
- `PORT=80`
- `MONGO_URI=...`
- `JWT_SECRET=...`
- `LOGIN_URL=http://localhost/auth/login`
- `SEED_CLIENT_ID=clnt0001`
- `SEED_CLIENT_SECRET=clientsecret0001`
- `ADMIN_USER=admin`
- `ADMIN_PASS=admin123`
- `SMOKE_BASE_URL=http://localhost:80`
- `SMOKE_AUD=device-smoke`
- `SMOKE_USER=user01`

## Response Contract

### Success
```json
{
  "code": "S...",
  "...data": "...",
  "message": "..."
}
```

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

Προυποθεσεις:
- Ο χρηστης πρεπει να υπαρχει στη βαση
- Ο χρηστης πρεπει να εχει καταχωρημενο `mobile`

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

Επιπλεον ελεγχοι εγκυροτητας:
- `hash`: 64-ψηφιο hex
- `grant=code`: `code` 32-ψηφιο hex
- `grant=sms`: `pin` ακριβως 6 ψηφια

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
  "code": "S200004",
  "access": "...",
  "refresh": "...",
  "message": "..."
}
```

Σημειωση:
- Το refresh flow κανει rotation. Καθε επιτυχημενο refresh επιστρεφει και νεο `refresh` token.

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
- `POST /admin/users/:id/logout?aud={device_aud}`
- `POST /admin/users/:id/logout-all-devices`
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

### Pagination και ταξινομηση (στα list endpoints)
Στα `GET /admin/codes`, `GET /admin/tokens`, `GET /admin/users`, `GET /admin/clients` υποστηριζονται:
- `page` (default `1`)
- `limit` (default `20`, max `200`)
- `sort_by` (ανα endpoint επιτρεπτα πεδια)
- `order=asc|desc` (default `desc`)

Παραδειγμα:
```http
GET /admin/tokens?page=2&limit=25&sort_by=iat&order=desc
```

Οι απαντησεις list περιεχουν και `meta`:
- `page`, `limit`, `total`, `pages`, `sort_by`, `order`

### Validation στα admin create/update
- Users:
  - `username`: 3-50 χαρακτηρες (`a-z`, `A-Z`, `0-9`, `.`, `_`, `-`)
  - `mobile`: 10-15 ψηφια (αν δοθει)
  - `is_active`: boolean (αν δοθει)
- Clients:
  - `client_id`: 8 αλφαριθμητικοι χαρακτηρες
  - `client_secret`: 16 χαρακτηρες
  - `code_exp`, `pin_exp`, `access_exp`, `refresh_exp`: θετικοι ακεραιοι

## Tests
## Refresh Token Rotation & Security

### Single-Use Rotation
Καθε refresh token μπορει να χρησιμοποιηθει ΜΟΝΟ μια φορα. Απο τη refresh αιτηση:
1. Ζητημα νεου refresh token (rotated)
2. Παλιο refresh ανακαλειται (revoked=true)
3. Επιστροφη νεου access + νεου refresh

```json
POST /auth/token/refresh
Response: {
  "code": "S200004",
  "access": "{new_access_token}",
  "refresh": "{new_refresh_token}"
}
```

### Family-Based Reuse Detection
Ολα τα refresh tokens απο αυτη τη login εχουν ιδιο `family_id`. Αν ενας refresh χρησιμοποιηθει 2+ φορες εντος 5 δευτερολεπτων:
- **Ολη η οικογενεια ανακαλειται** (concurrent reuse = compromise)
- Return 401 E401012 token_compromised_reuse_detected

### AUD Binding (Device-Specific)
Καθε token συνδεεται με συσκευη (aud). Αν refresh απο διαφορετικη συσκευη:
- Return 401 E401013 device_mismatch_token_revoked
- Προστατευει απο lateral movement

### Hash-Based Storage
Refresh tokens: SHA-256(token) στη DB, όχι raw
Access tokens: metadata only (jti, exp, user, aud, scopes)

###  Error Codes (Refresh)
- E401010: Token not found or revoked
- E401012: Concurrent reuse detected (family revoked)
- E401013: Device mismatch (AUD binding failed)
- E401014: Token already used previously

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
