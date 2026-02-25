import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { URL } from 'node:url';
import { database, dbPath } from './db.js';
import { cache, eventStateStore, getOrSetJsonCache, presenceStore, rateLimiter, sessionStore } from './cache.js';
import "./env.js";

const port = Number(process.env.PORT || 4000);

const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 5);
const LOGIN_RATE_LIMIT_WINDOW_MS = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const LOGIN_RATE_LIMIT_BLOCK_MS = Number(process.env.LOGIN_RATE_LIMIT_BLOCK_MS || 15 * 60 * 1000);
const AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'brocode-dev-secret-change-me';
const AUTH_TOKEN_TTL_SECONDS = Number(process.env.AUTH_TOKEN_TTL_SECONDS || 60 * 60 * 12);
const EVENT_STATE_DEFAULT_TTL_SECONDS = Number(process.env.EVENT_STATE_DEFAULT_TTL_SECONDS || 120);
const CORS_ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN || '*';

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

const parseBearerToken = (authHeader) => {
  if (typeof authHeader !== 'string') {
    return null;
  }

  const [scheme, token] = authHeader.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token;
};

const toBase64Url = (value) => Buffer.from(value).toString('base64url');

const signToken = (payload) =>
  createHmac('sha256', AUTH_TOKEN_SECRET).update(payload).digest('base64url');

const generateAuthToken = (user) => {
  const payload = {
    sub: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + AUTH_TOKEN_TTL_SECONDS,
  };

  const payloadPart = toBase64Url(JSON.stringify(payload));
  const signature = signToken(payloadPart);
  return `${payloadPart}.${signature}`;
};

const verifyAuthToken = (token) => {
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const expectedSignature = signToken(payloadPart);
  const providedSignatureBuffer = Buffer.from(signaturePart, 'base64url');
  const expectedSignatureBuffer = Buffer.from(expectedSignature, 'base64url');
  if (providedSignatureBuffer.length !== expectedSignatureBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf-8'));
    if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

const getUserFromAuthHeader = async (authHeader) => {
  const token = parseBearerToken(authHeader);
  if (!token) {
    return null;
  }

  const hasActiveSession = await sessionStore.hasActiveSession(token);
  if (!hasActiveSession) {
    return null;
  }

  const verifiedPayload = verifyAuthToken(token);
  if (!verifiedPayload) {
    return null;
  }

  return database.getUserById(verifiedPayload.sub);
};

const sendJson = (res, statusCode, body) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS_ALLOW_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
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
      const retryAfterSeconds = await rateLimiter.getBlockedSeconds(loginKey);
      if (retryAfterSeconds > 0) {
        sendJson(res, 429, {
          error: 'Too many failed login attempts. Please try again later.',
          retryAfterSeconds,
        });
        return;
      }

      const user = database.getUserByCredentials(username, password);

      if (!user) {
        await rateLimiter.recordFailure(loginKey, {
          maxAttempts: LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
          windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
          blockMs: LOGIN_RATE_LIMIT_BLOCK_MS,
        });
        sendJson(res, 401, { error: 'invalid credentials' });
        return;
      }

      await rateLimiter.clear(loginKey);

      const token = generateAuthToken(user);
      await sessionStore.setActiveSession(token, user.id, AUTH_TOKEN_TTL_SECONDS);

      sendJson(res, 200, { token, user });
      return;
    } catch (error) {
      sendJson(res, 400, { error: error.message });
      return;
    }
  }

  if (method === 'POST' && path === '/api/auth/logout') {
    const token = parseBearerToken(req.headers.authorization);
    if (!token) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    await sessionStore.clearActiveSession(token);
    sendJson(res, 200, { success: true });
    return;
  }

  if (method === 'GET' && path === '/api/catalog') {
    const catalog = await getOrSetJsonCache('catalog', async () => database.getCatalog());
    sendJson(res, 200, catalog);
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
    const spots = await getOrSetJsonCache('spots', async () => database.getSpots());
    sendJson(res, 200, spots);
    return;
  }

  if (method === 'GET' && path === '/api/orders') {
    const authedUser = await getUserFromAuthHeader(req.headers.authorization);
    if (!authedUser) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const spotId = parsedUrl.searchParams.get('spotId');
    const userId = parsedUrl.searchParams.get('userId');

    if (authedUser.role !== 'admin' && userId && userId !== authedUser.id) {
      sendJson(res, 403, { error: 'Forbidden' });
      return;
    }

    const effectiveUserId = authedUser.role === 'admin' ? userId : authedUser.id;

    const orders = database.getOrders({ spotId, userId: effectiveUserId });
    sendJson(res, 200, orders);
    return;
  }
  if (method === 'GET' && path.startsWith('/api/orders/')) {
    const orderId = path.replace('/api/orders/', '');

    const authedUser = await getUserFromAuthHeader(req.headers.authorization);
    if (!authedUser) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const order = database.getOrderById(orderId);

    if (!order) {
      sendJson(res, 404, { error: `Order not found: ${orderId}` });
      return;
    }

    const isAdmin = authedUser.role === 'admin';
    if (!isAdmin && order.userId !== authedUser.id) {
      sendJson(res, 403, { error: 'Forbidden' });
      return;
    }

    sendJson(res, 200, order);
    return;
  }

  if (method === 'POST' && path === '/api/orders') {
    try {
      const authedUser = await getUserFromAuthHeader(req.headers.authorization);
      if (!authedUser) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }

      const { spotId, userId, items } = await readBody(req);

      if (!spotId || !userId || !Array.isArray(items) || items.length === 0) {
        sendJson(res, 400, { error: 'spotId, userId and at least one order item are required' });
        return;
      }

      if (authedUser.role !== 'admin' && userId !== authedUser.id) {
        sendJson(res, 403, { error: 'Forbidden' });
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
    const authedUser = await getUserFromAuthHeader(req.headers.authorization);
    if (!authedUser || authedUser.role !== 'admin') {
      sendJson(res, 403, { error: 'Forbidden' });
      return;
    }

    const spotId = path.replace('/api/bills/', '');
    const bill = database.getBillBySpotId(spotId);
    sendJson(res, 200, bill);
    return;
  }

  if (method === 'DELETE' && path.startsWith('/api/users/')) {
    const authedUser = await getUserFromAuthHeader(req.headers.authorization);
    if (!authedUser || authedUser.role !== 'admin') {
      sendJson(res, 403, { error: 'Forbidden' });
      return;
    }

    const userId = path.replace('/api/users/', '');

    if (!userId) {
      sendJson(res, 400, { error: 'userId is required' });
      return;
    }

    if (!database.userExists(userId)) {
      sendJson(res, 404, { error: `Unknown userId: ${userId}` });
      return;
    }

    database.deleteUserCompletely(userId);
    sendJson(res, 200, { success: true, deletedUserId: userId });
    return;
  }

  if (method === 'POST' && path === '/api/presence/heartbeat') {
    const authedUser = await getUserFromAuthHeader(req.headers.authorization);
    if (!authedUser) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const payload = await readBody(req);
    const presence = await presenceStore.heartbeat(authedUser, payload);
    sendJson(res, 200, presence);
    return;
  }

  if (method === 'GET' && path === '/api/presence/active') {
    const authedUser = await getUserFromAuthHeader(req.headers.authorization);
    if (!authedUser) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const spotId = parsedUrl.searchParams.get('spotId');
    const activeUsers = await presenceStore.listActive(spotId);
    sendJson(res, 200, { activeUsers, count: activeUsers.length });
    return;
  }

  if ((method === 'PUT' || method === 'POST') && path.startsWith('/api/events/state/')) {
    const authedUser = await getUserFromAuthHeader(req.headers.authorization);
    if (!authedUser) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const eventKey = path.replace('/api/events/state/', '').trim();
    if (!eventKey) {
      sendJson(res, 400, { error: 'eventKey is required' });
      return;
    }

    const { state, ttlSeconds } = await readBody(req);
    if (typeof state === 'undefined') {
      sendJson(res, 400, { error: 'state is required' });
      return;
    }

    const effectiveTtl = Number(ttlSeconds || EVENT_STATE_DEFAULT_TTL_SECONDS);
    const saved = await eventStateStore.set(eventKey, state, effectiveTtl);
    sendJson(res, 200, saved);
    return;
  }

  if (method === 'GET' && path.startsWith('/api/events/state/')) {
    const authedUser = await getUserFromAuthHeader(req.headers.authorization);
    if (!authedUser) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const eventKey = path.replace('/api/events/state/', '').trim();
    const eventState = await eventStateStore.get(eventKey);

    if (!eventState) {
      sendJson(res, 404, { error: `No temporary state found for event: ${eventKey}` });
      return;
    }

    sendJson(res, 200, eventState);
    return;
  }

  sendJson(res, 404, { error: 'Route not found' });
});

server.listen(port, () => {
  console.log(`Backend API running on http://localhost:${port}`);
  console.log(`Using local database at: ${dbPath}`);
  console.log(`Cache mode: ${cache.mode}`);
});
