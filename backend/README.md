# Backend API

A minimal Node.js backend for BroCode Spot backed by a persistent SQLite database.

## Start

```bash
npm run backend
```

Server starts at `http://localhost:4000` by default.

## Database

### Issue #26: Move from in-memory store to persistent DB

- Uses `node:sqlite` with a local database file at `backend/data/brocode.sqlite`.
- You can override the location with `BROCODE_DB_PATH=/custom/path.sqlite npm run backend`.
- On first start, seed data is inserted for users, spots, catalog items, and a sample order.
- New orders are validated against DB data (known `spotId`, `userId`, `productId`) and item pricing is always derived from catalog prices in the database.

### Issue #28: Secure credential storage and verification

- Passwords are stored as salted `scrypt` hashes (not plaintext).
- Legacy plaintext user passwords are auto-migrated to hashed values on successful login.

## Available endpoints

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/catalog`
- `GET /api/catalog/:category` (`drinks`, `food`, `cigarettes`)
- `GET /api/spots`
- `GET /api/orders?spotId=...&userId=...`
- `POST /api/orders`
- `GET /api/bills/:spotId`
- `DELETE /api/users/:userId` (removes the user and all related records)

## Example login payload

```json
{
  "username": "brocode",
  "password": "changeme"
}
```
