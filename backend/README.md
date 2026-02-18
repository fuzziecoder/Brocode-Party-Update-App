# Backend API (Starter)

A minimal Node.js backend for BroCode Spot.

## Start

```bash
npm run backend
```

Server starts at `http://localhost:4000` by default.

## Available endpoints

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/catalog`
- `GET /api/catalog/:category` (`drinks`, `food`, `cigarettes`)
- `GET /api/spots`
- `GET /api/orders?spotId=...&userId=...`
- `POST /api/orders`
- `GET /api/bills/:spotId`

## Example login payload

```json
{
  "username": "brocode",
  "password": "changeme"
}
```

## Note

Data is currently in-memory and resets whenever the process restarts. See `backend/store.js`.
