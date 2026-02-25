import crypto from 'node:crypto';

const REDIS_URL = process.env.REDIS_URL;
const REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'brocode';
const CACHE_DEFAULT_TTL_SECONDS = Number(process.env.CACHE_DEFAULT_TTL_SECONDS || 60);
const PRESENCE_TTL_SECONDS = Number(process.env.PRESENCE_TTL_SECONDS || 60);

const toKey = (key) => `${REDIS_KEY_PREFIX}:${key}`;

class MemoryStore {
  constructor() {
    this.values = new Map();
    this.expiries = new Map();
    this.sets = new Map();
  }

  cleanupExpired(key) {
    const expiresAt = this.expiries.get(key);
    if (expiresAt && expiresAt <= Date.now()) {
      this.values.delete(key);
      this.expiries.delete(key);
      return true;
    }

    return false;
  }

  async get(key) {
    this.cleanupExpired(key);
    return this.values.get(key) ?? null;
  }

  async set(key, value, options = {}) {
    this.values.set(key, value);

    const exSeconds = Number(options.EX || 0);
    if (exSeconds > 0) {
      this.expiries.set(key, Date.now() + exSeconds * 1000);
    } else {
      this.expiries.delete(key);
    }

    return 'OK';
  }

  async del(keys) {
    const arr = Array.isArray(keys) ? keys : [keys];
    arr.forEach((key) => {
      this.values.delete(key);
      this.expiries.delete(key);
      this.sets.delete(key);
    });
    return arr.length;
  }

  async incr(key) {
    const current = Number((await this.get(key)) || 0);
    const next = current + 1;
    this.values.set(key, String(next));
    return next;
  }

  async sAdd(key, member) {
    const current = this.sets.get(key) || new Set();
    current.add(member);
    this.sets.set(key, current);
    return 1;
  }

  async sMembers(key) {
    return [...(this.sets.get(key) || new Set())];
  }

  async sRem(key, member) {
    const current = this.sets.get(key);
    if (!current) {
      return 0;
    }

    current.delete(member);
    if (current.size === 0) {
      this.sets.delete(key);
    }

    return 1;
  }
}

const createCacheClient = async () => {
  if (!REDIS_URL) {
    console.warn('⚠️ REDIS_URL not configured. Falling back to in-memory cache store.');
    return { client: new MemoryStore(), mode: 'memory' };
  }

  try {
    const { createClient } = await import('redis');
    const client = createClient({ url: REDIS_URL });
    client.on('error', (error) => {
      console.error('Redis client error:', error.message);
    });
    await client.connect();
    console.log('✅ Connected to Redis');
    return { client, mode: 'redis' };
  } catch (error) {
    console.warn(`⚠️ Redis unavailable (${error.message}). Falling back to in-memory cache store.`);
    return { client: new MemoryStore(), mode: 'memory' };
  }
};

const parseJson = (raw) => {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const cache = await createCacheClient();

export const getOrSetJsonCache = async (key, fetcher, ttlSeconds = CACHE_DEFAULT_TTL_SECONDS) => {
  const cacheKey = toKey(`cache:${key}`);
  const cached = await cache.client.get(cacheKey);
  if (cached) {
    const parsed = parseJson(cached);
    if (parsed !== null) {
      return parsed;
    }
  }

  const freshValue = await fetcher();
  await cache.client.set(cacheKey, JSON.stringify(freshValue), { EX: ttlSeconds });
  return freshValue;
};

export const sessionStore = {
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  async setActiveSession(token, userId, ttlSeconds) {
    const tokenHash = this.hashToken(token);
    await cache.client.set(toKey(`session:${tokenHash}`), userId, { EX: ttlSeconds });
  },

  async hasActiveSession(token) {
    const tokenHash = this.hashToken(token);
    return Boolean(await cache.client.get(toKey(`session:${tokenHash}`)));
  },

  async clearActiveSession(token) {
    const tokenHash = this.hashToken(token);
    await cache.client.del(toKey(`session:${tokenHash}`));
  },
};

export const rateLimiter = {
  async getBlockedSeconds(key) {
    const blockedUntil = Number((await cache.client.get(toKey(`ratelimit:block:${key}`))) || 0);
    if (!blockedUntil) {
      return 0;
    }

    const remainingMs = blockedUntil - Date.now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  },

  async recordFailure(key, { maxAttempts, windowMs, blockMs }) {
    const attemptsKey = toKey(`ratelimit:attempts:${key}`);
    const blockKey = toKey(`ratelimit:block:${key}`);

    const attempts = await cache.client.incr(attemptsKey);
    if (attempts === 1) {
      await cache.client.set(attemptsKey, String(attempts), { EX: Math.ceil(windowMs / 1000) });
    }

    if (attempts >= maxAttempts) {
      const blockedUntil = Date.now() + blockMs;
      await cache.client.set(blockKey, String(blockedUntil), { EX: Math.ceil(blockMs / 1000) });
    }
  },

  async clear(key) {
    await cache.client.del([toKey(`ratelimit:attempts:${key}`), toKey(`ratelimit:block:${key}`)]);
  },
};

const PRESENCE_SET_KEY = toKey('presence:active-users');

export const presenceStore = {
  async heartbeat(user, payload = {}) {
    const key = toKey(`presence:user:${user.id}`);
    const entry = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      spotId: payload.spotId || null,
      status: payload.status || 'online',
      updatedAt: new Date().toISOString(),
    };

    await cache.client.set(key, JSON.stringify(entry), { EX: PRESENCE_TTL_SECONDS });
    await cache.client.sAdd(PRESENCE_SET_KEY, user.id);
    return entry;
  },

  async listActive(spotId) {
    const userIds = await cache.client.sMembers(PRESENCE_SET_KEY);
    const active = [];

    for (const userId of userIds) {
      const raw = await cache.client.get(toKey(`presence:user:${userId}`));
      if (!raw) {
        await cache.client.sRem(PRESENCE_SET_KEY, userId);
        continue;
      }

      const parsed = parseJson(raw);
      if (!parsed) {
        continue;
      }

      if (!spotId || parsed.spotId === spotId) {
        active.push(parsed);
      }
    }

    return active;
  },
};

export const eventStateStore = {
  async set(eventKey, state, ttlSeconds = 120) {
    const key = toKey(`event-state:${eventKey}`);
    const payload = {
      eventKey,
      state,
      updatedAt: new Date().toISOString(),
      ttlSeconds,
    };

    await cache.client.set(key, JSON.stringify(payload), { EX: ttlSeconds });
    return payload;
  },

  async get(eventKey) {
    const key = toKey(`event-state:${eventKey}`);
    return parseJson(await cache.client.get(key));
  },
};
