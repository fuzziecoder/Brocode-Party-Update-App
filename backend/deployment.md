# Deployment guide

This project can be deployed with the following stack:

- **Backend**: Render, Railway, or AWS EC2
- **Database (PostgreSQL)**: Supabase or Neon
- **Redis**: Upstash
- **File storage**: AWS S3 or Cloudinary

> Current repo runtime still uses a local JSON DB for persistence. `DATABASE_URL`, `REDIS_URL`, and storage variables are wired into env validation so you can safely provide production credentials while evolving integrations.

## 1) Required environment variables

Use these common variables in all platforms:

```bash
PORT=4000
AUTH_TOKEN_SECRET=replace-with-long-secret
AUTH_TOKEN_TTL_SECONDS=43200
CORS_ALLOW_ORIGIN=https://your-frontend-domain.com

# Security/rate-limit tuning
SECURITY_HEADERS_CSP=default-src 'self'
GLOBAL_RATE_LIMIT_MAX_REQUESTS=300
GLOBAL_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=5
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_BLOCK_MS=900000

# PostgreSQL (Supabase/Neon)
DATABASE_URL=postgresql://...

# Redis (Upstash)
REDIS_URL=redis://...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Storage (choose one)
STORAGE_DRIVER=s3
AWS_REGION=ap-south-1
AWS_S3_BUCKET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# OR
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## 2) Render

1. Create a **Web Service** from this repo.
2. Build command: `npm install && npm run build`
3. Start command: `npm run backend`
4. Add the env vars above in Render dashboard.
5. Add PostgreSQL (Supabase/Neon external) and Upstash connection URLs.

## 3) Railway

1. Create a new Railway project linked to this repo.
2. Set start command to `npm run backend`.
3. Add all env vars in the Variables tab.
4. Set custom domain and update `CORS_ALLOW_ORIGIN`.

## 4) AWS EC2

1. Provision Ubuntu instance and install Node.js LTS.
2. Clone repo and run `npm install`.
3. Configure env vars in systemd service file.
4. Run service with `npm run backend` via systemd.
5. Put Nginx in front with HTTPS (Let's Encrypt).

Example service snippet:

```ini
[Service]
WorkingDirectory=/srv/Brocode-Party-Update-App
ExecStart=/usr/bin/npm run backend
Environment=PORT=4000
Environment=AUTH_TOKEN_SECRET=replace-me
Restart=always
```

## 5) PostgreSQL provider choice

- **Supabase**: Copy pooled connection string from Project Settings → Database.
- **Neon**: Copy connection string from Neon project dashboard.
- Set as `DATABASE_URL`.

## 6) Redis (Upstash)

- Create Redis database in Upstash.
- Use TCP URL as `REDIS_URL` (if your runtime supports it).
- For REST-based access, set both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

## 7) File storage

- **AWS S3**: set `STORAGE_DRIVER=s3` + AWS credentials and bucket vars.
- **Cloudinary**: set `STORAGE_DRIVER=cloudinary` + Cloudinary keys.

## 8) Post-deploy checks

- `GET /api/health` returns status 200.
- Login endpoint returns token and includes security headers.
- CORS allows only your front-end domain.
- Rate limiting returns 429 after repeated requests.
