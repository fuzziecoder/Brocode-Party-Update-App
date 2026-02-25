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

See [`backend/deployment.md`](./deployment.md) for step-by-step deployment options and env setup for:

- Backend hosting: **Render**, **Railway**, **AWS EC2**
- PostgreSQL: **Supabase** or **Neon**
- Redis: **Upstash**
- File storage: **AWS S3** or **Cloudinary**

## Available endpoints

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/catalog`
- `GET /api/catalog/:category` (`drinks`, `food`, `cigarettes`)
- `GET /api/spots`
- `GET /api/orders?spotId=...&userId=...` (auth required)
- `GET /api/orders/:id` (auth required)
- `POST /api/orders` (auth required)
- `GET /api/bills/:spotId` (admin only)
- `DELETE /api/users/:userId` (admin only; removes the user and all related records)

## Example login payload

```json
{
  "username": "brocode",
  "password": "changeme"
}
```
