# 🔐 JWT Authentication API

> Σύστημα αυθεντικοποίησης βασισμένο σε JWT tokens, με υποστήριξη κωδικού (code) και SMS PIN.

---

## 📦 Τεχνολογίες

- **Node.js** + **Express**
- **MongoDB** + **Mongoose**
- **JWT** (jsonwebtoken)

---

## 🗄️ Μοντέλα Βάσης Δεδομένων

### 📋 Agents (Εφαρμογές-Πελάτες)

| Πεδίο | Τύπος | Περιγραφή |
|---|---|---|
| `id` | Number(15) | Primary Key, Auto Increment |
| `name` | String(20) | Όνομα agent |
| `client_id` | String(8) | Μοναδικό αναγνωριστικό |
| `client_secret` | String(16) | Μυστικό κλειδί |
| `code_exp` | Number(10) | Διάρκεια ισχύος code (sec) |
| `pin_exp` | Number(10) | Διάρκεια ισχύος PIN (sec) |
| `access_exp` | Number(10) | Διάρκεια ισχύος access token (sec) |
| `refresh_exp` | Number(10) | Διάρκεια ισχύος refresh token (sec) |

---

### 📋 Codes (Κωδικοί & PIN)

| Πεδίο | Τύπος | Περιγραφή |
|---|---|---|
| `client_id` | String(8) | PK — Αναγνωριστικό agent |
| `code` | String(32) | PK — HEX κωδικός |
| `pin` | Number(6) | PK — 6-ψήφιο PIN |
| `user` | String(50) | Χρήστης |
| `aud` | String(20) | PK — Device ID |
| `exp` | Number(10) | Unix timestamp λήξης |

---

### 📋 Tokens (JWT Tokens)

| Πεδίο | Τύπος | Περιγραφή |
|---|---|---|
| `jti` | String(43) | PK — hash_hmac('sha256', {client_id}{user}{aud}{scopes}, {client_secret}) |
| `type` | Number(1) | PK — 0=access, 1=refresh |
| `iat` | Number(10) | PK — Χρόνος έκδοσης (Unix) |
| `exp` | Number(10) | Χρόνος λήξης (Unix) |
| `client_id` | String(8) | Αναγνωριστικό agent |
| `aud` | String(50) | Device ID |
| `user` | String(50) | Χρήστης |
| `scopes` | String(100) | Δικαιώματα (π.χ. invoice/all signature/write peppol/read) |

---

## 🛣️ Endpoints

### `GET /auth/code` — Δημιουργία Κωδικού Σύνδεσης

**Headers:**
```
client_id: {hex-8}
```

**Query Params:**
```
aud   = {device_id}
hash  = hash_hmac('sha256', "{client_id}:{aud}", {client_secret})
lang  = GR | EN
```

**Διαδικασία:**
1. Έλεγχος `client_id` από τον agent → αποτυχία: `403`
2. Έλεγχος `hash` → αναντιστοιχία: `403`
3. Δημιουργία `code = bin2hex(random_bytes(16))`
   - Αν υπάρχει και **δεν έχει λήξει** → retry (έως 10 φορές) → αποτυχία: `500`
   - Αν υπάρχει και **έχει λήξει** → αντικατάσταση
   - Αν δεν υπάρχει → εισαγωγή
4. Επιστροφή `200`:
```json
{ "code": "{code}", "url": "{login_url}" }
```

---

### `POST /auth/sms` — Αποστολή PIN μέσω SMS

**Headers:**
```
client_id: {hex-8}
```

**Query Params:**
```
hash = hash_hmac('sha256', "{client_id}:{user}:{aud}", {client_secret})
lang = GR | EN
```

**Body:**
```json
{ "user": "{users_p00}", "aud": "{device_id}" }
```

**Διαδικασία:**
1. Έλεγχος `client_id` → αποτυχία: `403`
2. Έλεγχος `hash` → αναντιστοιχία: `403`
3. Χρήστης δεν υπάρχει → `403`
4. Αριθμός κινητού δεν υπάρχει → `400`
5. Διαγραφή όλων των codes για `client_id + user + aud`
6. Δημιουργία `PIN = str_pad(rand(0,999999), 6, '0', STR_PAD_LEFT)`
   - Αν υπάρχει και **δεν έχει λήξει** → retry (έως 10 φορές) → αποτυχία: `500`
   - Αν υπάρχει και **έχει λήξει** → αντικατάσταση
   - Αν δεν υπάρχει → εισαγωγή
7. Αποστολή SMS αποτυχία → διαγραφή PIN → `500`
8. Επιστροφή `200`

> **UI Login:** Μετά την επιτυχή σύνδεση μέσω code, ορίζεται `codes.user = users_p00`

---

### `POST /auth/token` — Έκδοση Tokens

**Headers:**
```
client_id: {hex-8}
```

**Query Params:**
```
hash  = hash_hmac('sha256', "{client_id}:{code_or_pin}", {client_secret})
lang  = GR | EN
```

**Body:**
```json
{
  "grant": "code | SMS",
  "code": "{code-string}",
  "pin":  "{6-digit-pin}"
}
```

**Διαδικασία:**
1. Έλεγχος `client_id` → αποτυχία: `403`
2. Έλεγχος `hash` → αναντιστοιχία: `403`
3. Έλεγχος code ή PIN:
   - Δεν υπάρχει στον πίνακα Codes → `401`
   - Έχει λήξει → διαγραφή + `401`
   - Υπάρχει και ισχύει → διαγραφή
4. Δημιουργία JWT tokens (payload: `jti, iat, exp, aud, scopes`) → αποτυχία: `500`
5. Διαγραφή όλων των tokens για `user + aud`
6. Αποθήκευση νέων tokens στον πίνακα Tokens
7. Επιστροφή `200`:
```json
{ "access": "{access_token}", "refresh": "{refresh_token}" }
```

---

### `POST /auth/token/refresh` — Ανανέωση Access Token

**Query Params:**
```
lang = GR | EN
```

**Body:**
```json
{ "token": "{refresh_token}" }
```

**Διαδικασία:**
1. Token δεν είναι έγκυρο → `401`
2. Token έχει λήξει → `401`
3. Αδυναμία φόρτωσης από DB → `401`
4. Δημιουργία νέου JWT access token (από δεδομένα refresh token) → αποτυχία: `500`
5. Διαγραφή όλων των access tokens για `user + aud`
6. Αποθήκευση νέου access token στη DB
7. Επιστροφή `200`:
```json
{ "access": "{new_access_token}" }
```

---

## 🛡️ Middleware — `POST /*`

Εφαρμόζεται σε όλα τα προστατευμένα endpoints.

| Βήμα | Έλεγχος | Σφάλμα |
|---|---|---|
| 1 | Access token δεν είναι έγκυρο | `401` |
| 2 | Access token έχει λήξει | `401` |
| 3 | Το scope του endpoint δεν βρίσκεται στα scopes του token | `401` |
| 4 | Access token δεν υπάρχει στον πίνακα Tokens | `401` |
| 5 | Φόρτωση χρήστη: `users_p00 = tokens.user` | — |
| 6 | Σύνδεση στη βάση χρηστών | — |
| 7 | Ενημέρωση στατιστικών agent, χρήστη και device | — |
