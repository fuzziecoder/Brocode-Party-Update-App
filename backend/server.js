import { createServer } from 'node:http';
import { URL } from 'node:url';
import { database, dbPath } from './db.js';

const port = Number(process.env.PORT || 4000);

const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 5);
const LOGIN_RATE_LIMIT_WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const LOGIN_RATE_LIMIT_BLOCK_MS = Number(process.env.LOGIN_RATE_LIMIT_BLOCK_MS || 15 * 60 * 1000);
const loginAttempts = new Map();

const getLoginKey = (req, username) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const firstForwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0]
      : '';
  const remoteIp = firstForwardedIp?.trim() || req.socket?.remoteAddress || 'unknown-ip';
  return `${remoteIp}:${username}`;
};

const getRateLimitState = (key) => {
  const now = Date.now();
  const existing = loginAttempts.get(key);

  if (!existing) {
    const state = { count: 0, windowStart: now, blockedUntil: 0 };
    loginAttempts.set(key, state);
    return state;
  }

  if (existing.blockedUntil > 0 && existing.blockedUntil <= now) {
    existing.count = 0;
    existing.windowStart = now;
    existing.blockedUntil = 0;
  }

  if (now - existing.windowStart > LOGIN_RATE_LIMIT_WINDOW_MS) {
    existing.count = 0;
    existing.windowStart = now;
  }

  return existing;
};

const clearRateLimitState = (key) => {
  loginAttempts.delete(key);
};

const recordFailedLoginAttempt = (key) => {
  const now = Date.now();
  const state = getRateLimitState(key);
  state.count += 1;

  if (state.count >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    state.blockedUntil = now + LOGIN_RATE_LIMIT_BLOCK_MS;
  }
};

const sendJson = (res, statusCode, body) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
    });

    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });

    req.on('error', reject);
  });

const server = createServer(async (req, res) => {
  const method = req.method || 'GET';
  const parsedUrl = new URL(req.url || '/', `http://localhost:${port}`);
  const path = parsedUrl.pathname;

  if (method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (method === 'GET' && path === '/api/health') {
    sendJson(res, 200, { status: 'ok', service: 'brocode-backend', timestamp: new Date().toISOString() });
    return;
  }

  if (method === 'POST' && path === '/api/auth/login') {
    try {
      const { username, password } = await readBody(req);

      if (!username || !password) {
        sendJson(res, 400, { error: 'username and password are required' });
        return;
      }

      const loginKey = getLoginKey(req, username);
      const rateLimitState = getRateLimitState(loginKey);
      const now = Date.now();
      if (rateLimitState.blockedUntil > now) {
        const retryAfterSeconds = Math.ceil((rateLimitState.blockedUntil - now) / 1000);
        sendJson(res, 429, {
          error: 'Too many failed login attempts. Please try again later.',
          retryAfterSeconds,
        });
        return;
      }

      const user = database.getUserByCredentials(username, password);

      if (!user) {
        recordFailedLoginAttempt(loginKey);
        sendJson(res, 401, { error: 'invalid credentials' });
        return;
      }

      clearRateLimitState(loginKey);

      sendJson(res, 200, { token: `demo-token-${user.id}`, user });
      return;
    } catch (error) {
      sendJson(res, 400, { error: error.message });
      return;
    }
  }

  if (method === 'GET' && path === '/api/catalog') {
    sendJson(res, 200, database.getCatalog());
    return;
  }

  if (method === 'GET' && path.startsWith('/api/catalog/')) {
    const category = path.replace('/api/catalog/', '');
    const catalog = database.getCatalog();
    const items = catalog[category];

    if (!items) {
      sendJson(res, 404, { error: `Unknown category: ${category}` });
      return;
    }

    sendJson(res, 200, items);
    return;
  }

  if (method === 'GET' && path === '/api/spots') {
    sendJson(res, 200, database.getSpots());
    return;
  }

  if (method === 'GET' && path === '/api/orders') {
    const spotId = parsedUrl.searchParams.get('spotId');
    const userId = parsedUrl.searchParams.get('userId');

    const orders = database.getOrders({ spotId, userId });
    sendJson(res, 200, orders);
    return;
  }
  if (method === 'GET' && path.startsWith('/api/orders/')) {
    console.log("I AM INSIDE ORDER ID ROUTE");
  const orderId = path.replace('/api/orders/', '');

 
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return;
  }

  const orders = database.getOrders({});
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    sendJson(res, 404, { error: `Order not found: ${orderId}` });
    return;
  }

  sendJson(res, 200, order);
  return;
}

  if (method === 'POST' && path === '/api/orders') {
    try {
      const { spotId, userId, items } = await readBody(req);

      if (!spotId || !userId || !Array.isArray(items) || items.length === 0) {
        sendJson(res, 400, { error: 'spotId, userId and at least one order item are required' });
        return;
      }

      if (!database.userExists(userId)) {
        sendJson(res, 404, { error: `Unknown userId: ${userId}` });
        return;
      }

      if (!database.spotExists(spotId)) {
        sendJson(res, 404, { error: `Unknown spotId: ${spotId}` });
        return;
      }

      const newOrder = database.createOrder({ spotId, userId, items });
      sendJson(res, 201, newOrder);
      return;
    } catch (error) {
      const isValidationError =
        error.message.includes('Unknown productId') ||
        error.message.includes('Each order item must include productId');

      sendJson(res, isValidationError ? 400 : 500, { error: error.message });
      return;
    }
  }

  if (method === 'GET' && path.startsWith('/api/bills/')) {
    const spotId = path.replace('/api/bills/', '');
    const bill = database.getBillBySpotId(spotId);
    sendJson(res, 200, bill);
    return;
  }

  sendJson(res, 404, { error: 'Route not found' });
});

server.listen(port, () => {
  console.log(`Backend API running on http://localhost:${port}`);
  console.log(`Using SQLite database at: ${dbPath}`);
});
