# Backend API

A minimal Node.js backend for BroCode Spot backed by a persistent JSON file database.

## Start

```bash
npm run backend
```

Server starts at `http://localhost:4000` by default.

## Database

### Issue #26: Move from in-memory store to persistent DB

- Uses a local JSON database file at `backend/data/brocode.json`.
- You can override the location with `BROCODE_DB_PATH=/custom/path.json npm run backend`.
- On first start, seed data is inserted for users, spots, catalog items, and a sample order.
- New orders are validated against DB data (known `spotId`, `userId`, `productId`) and item pricing is always derived from catalog prices in the database.

### Issue #28: Secure credential storage and verification

- Passwords are stored as salted `scrypt` hashes (not plaintext).
- Legacy plaintext user passwords are auto-migrated to hashed values on successful login.

### Issue #29: Protect login endpoint from brute-force attempts

- Login is now rate-limited per `IP + username` key.
- Defaults: 5 failed attempts within 15 minutes triggers a 15 minute temporary block (`429`).
- Configure via env vars:
  - `LOGIN_RATE_LIMIT_MAX_ATTEMPTS`
  - `LOGIN_RATE_LIMIT_WINDOW_MS`
  - `LOGIN_RATE_LIMIT_BLOCK_MS`

### Issue #31: Redis-backed caching + session/performance primitives

- Added optional Redis integration (`REDIS_URL`) with automatic in-memory fallback when Redis is unavailable.
- Active auth sessions are now stored in cache (token hash), and protected routes require an active session.
- Added cache-backed rate limiting primitives for login attempts (window + temporary block).
- Added short-lived cache for read-heavy endpoints:
  - `GET /api/catalog` (cached)
  - `GET /api/spots` (cached)
- Added real-time presence endpoints:
  - `POST /api/presence/heartbeat`
  - `GET /api/presence/active?spotId=...`
- Added temporary event state endpoints:
  - `PUT|POST /api/events/state/:eventKey`
  - `GET /api/events/state/:eventKey`
- New env vars:
  - `REDIS_URL`
  - `REDIS_KEY_PREFIX`
  - `CACHE_DEFAULT_TTL_SECONDS`
  - `PRESENCE_TTL_SECONDS`
  - `EVENT_STATE_DEFAULT_TTL_SECONDS`

### Issue #30: Secure backend data access with signed auth tokens + authorization

- Login now returns an HMAC-signed bearer token (replacing predictable demo tokens).
- Tokens include user id, role, and expiry, and are validated with constant-time signature checks.
- Data endpoints now require `Authorization: Bearer <token>` and enforce role access:
  - `GET /api/orders` → users can only read their own orders; admins can read all.
  - `POST /api/orders` → users can create only for themselves; admins can create for any user.
  - `GET /api/orders/:id` → users can read only their own order; admins can read any order.
  - `GET /api/bills/:spotId` and `DELETE /api/users/:userId` → admin only.
- Configure via env vars:
  - `AUTH_TOKEN_SECRET`
  - `AUTH_TOKEN_TTL_SECONDS`
  - `CORS_ALLOW_ORIGIN`


## Available endpoints

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/catalog` (cached)
- `GET /api/catalog/:category` (`drinks`, `food`, `cigarettes`)
- `GET /api/spots` (cached)
- `GET /api/orders?spotId=...&userId=...` (auth required)
- `GET /api/orders/:id` (auth required)
- `POST /api/orders` (auth required)
- `GET /api/bills/:spotId` (admin only)
- `DELETE /api/users/:userId` (admin only; removes the user and all related records)
- `POST /api/presence/heartbeat` (auth required)
- `GET /api/presence/active?spotId=...` (auth required)
- `PUT|POST /api/events/state/:eventKey` (auth required)
- `GET /api/events/state/:eventKey` (auth required)

## Example login payload

```json
{
  "username": "brocode",
  "password": "changeme"
}
```
