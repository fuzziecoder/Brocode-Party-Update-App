# Backend API

A minimal Node.js backend for BroCode Spot backed by a persistent JSON file database.

## Start

```bash
npm run backend
```

Server starts at `http://localhost:4000` by default.

## Security Layer

### Helmet-style security headers

The server now sends strict security headers on every API response, including:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Cross-Origin-*` hardening headers

Configure CSP via `SECURITY_HEADERS_CSP`.

### CORS

CORS is applied to all endpoints with these defaults:

- Allowed origin from `CORS_ALLOW_ORIGIN` (defaults to `*`)
- Allowed headers: `Content-Type`, `Authorization`
- Allowed methods: `GET,POST,DELETE,OPTIONS`

### Rate limiting

Two limits are active:

1. **Global API limiter** per IP (`GLOBAL_RATE_LIMIT_MAX_REQUESTS` in `GLOBAL_RATE_LIMIT_WINDOW_MS`)
2. **Login brute-force limiter** per `IP + username`
   (`LOGIN_RATE_LIMIT_MAX_ATTEMPTS` in `LOGIN_RATE_LIMIT_WINDOW_MS`, temporary block for `LOGIN_RATE_LIMIT_BLOCK_MS`)

Both return HTTP `429` and `Retry-After` headers.

### Password hashing

User credentials are stored as salted hashes (using Node crypto `scrypt`) and never as plaintext.
Legacy plaintext records auto-migrate to hashed values at successful login.

## Database

- Uses a local JSON database file at `backend/data/brocode.json`.
- You can override the location with `BROCODE_DB_PATH=/custom/path.json npm run backend`.
- On first start, seed data is inserted for users, spots, catalog items, and a sample order.
- New orders are validated against DB data (known `spotId`, `userId`, `productId`) and item pricing is always derived from catalog prices in the database.

## Deployment (Render / Railway / AWS EC2)
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

See [`backend/deployment.md`](./deployment.md) for step-by-step deployment options and env setup for:

- Backend hosting: **Render**, **Railway**, **AWS EC2**
- PostgreSQL: **Supabase** or **Neon**
- Redis: **Upstash**
- File storage: **AWS S3** or **Cloudinary**
### Background jobs (BullMQ + Redis)

- The backend initializes BullMQ queues for:
  - email notification jobs (`email-notifications`) when a new order is created.
  - scheduled reminder jobs (`spot-reminders`) for upcoming spots/events.
  - recurring cleanup jobs (`expired-spot-cleanup`) for expired events.
- Redis connection settings:
  - `REDIS_HOST` (default `127.0.0.1`)
  - `REDIS_PORT` (default `6379`)
  - `REDIS_PASSWORD` (optional)
- Reminder timing:
  - `EVENT_REMINDER_BEFORE_HOURS` (default `2`)
- If BullMQ or Redis dependencies are unavailable, backend continues to run with jobs disabled and logs a warning.

### API Documentation (Swagger/OpenAPI)

- OpenAPI JSON is available at `GET /api/docs/openapi.json`.
- Swagger UI is available at `GET /api/docs`.

## Available endpoints

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/docs`
- `GET /api/docs/openapi.json`
- `GET /api/catalog`
- `POST /api/auth/logout`
- `GET /api/catalog` (cached)
- `GET /api/catalog/:category` (`drinks`, `food`, `cigarettes`)
- `GET /api/spots` (cached)
- `GET /api/orders?spotId=...&userId=...` (auth required)
- `GET /api/orders/:id` (auth required)
- `POST /api/orders` (auth required)
- `GET /api/bills/:spotId` (admin only)
- `DELETE /api/users/:userId` (admin only; removes the user and all related records)
- `POST /api/jobs/reminders/run` (admin only; manually queue reminder jobs)
- `POST /api/jobs/cleanup/run` (admin only; manually queue expired-event cleanup)
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
