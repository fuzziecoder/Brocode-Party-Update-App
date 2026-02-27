import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { dirname, resolve } from 'node:path';

const defaultDbPath = resolve(process.cwd(), 'backend', 'data', 'brocode.json');
const dbPath = process.env.BROCODE_DB_PATH ? resolve(process.env.BROCODE_DB_PATH) : defaultDbPath;

const dbDirectory = dirname(dbPath);
if (!existsSync(dbDirectory)) {
  mkdirSync(dbDirectory, { recursive: true });
}

const HASH_PREFIX = 'scrypt$';
const SCRYPT_KEY_LENGTH = 64;

const hashPassword = (password, saltHex = randomBytes(16).toString('hex')) => {
  const derivedKey = scryptSync(password, Buffer.from(saltHex, 'hex'), SCRYPT_KEY_LENGTH);
  return `${HASH_PREFIX}${saltHex}$${derivedKey.toString('hex')}`;
};

const verifyPassword = (password, storedPassword) => {
  if (!storedPassword?.startsWith(HASH_PREFIX)) {
    return password === storedPassword;
  }

  const [, saltHex, expectedHashHex] = storedPassword.split('$');
  const candidateHash = scryptSync(password, Buffer.from(saltHex, 'hex'), SCRYPT_KEY_LENGTH);
  const expectedHash = Buffer.from(expectedHashHex, 'hex');

  if (candidateHash.length !== expectedHash.length) {
    return false;
  }

  return timingSafeEqual(candidateHash, expectedHash);
};

const seedData = () => ({
  users: [
    { id: 'u-1', username: 'brocode', password: hashPassword('changeme'), name: 'Ram', role: 'admin' },
    { id: 'u-2', username: 'dhanush', password: hashPassword('changeme'), name: 'Dhanush', role: 'user' },
  ],
  spots: [
    {
      id: 'spot-2025-07-26',
      location: 'Attibele Toll Plaza',
      date: '2025-07-26T10:00:00.000Z',
      host_user_id: 'u-1',
    },
  ],
  catalog_items: [
    { id: 'd-1', category: 'drinks', name: 'Brocode Beer', price: 180 },
    { id: 'd-2', category: 'drinks', name: 'Kingfisher Beer', price: 170 },
    { id: 'f-1', category: 'food', name: 'Beef Biriyani', price: 220 },
    { id: 'f-2', category: 'food', name: 'Parotta', price: 30 },
    { id: 'c-1', category: 'cigarettes', name: 'Marlboro', price: 25 },
    { id: 'c-2', category: 'cigarettes', name: 'Classic', price: 20 },
  ],
  orders: [
    {
      id: 'ord-1',
      spot_id: 'spot-2025-07-26',
      user_id: 'u-2',
      total_amount: 360,
      created_at: '2025-07-26T10:30:00.000Z',
    },
  ],
  order_items: [
    {
      id: 1,
      order_id: 'ord-1',
      product_id: 'd-1',
      name: 'Brocode Beer',
      quantity: 2,
      unit_price: 180,
      total: 360,
    },
  ],
  next_order_item_id: 2,
});

const loadData = () => {
  if (!existsSync(dbPath)) {
    const initial = seedData();
    writeFileSync(dbPath, JSON.stringify(initial, null, 2));
    return initial;
  }

  try {
    const parsed = JSON.parse(readFileSync(dbPath, 'utf-8'));
    return {
      users: parsed.users || [],
      spots: parsed.spots || [],
      catalog_items: parsed.catalog_items || [],
      orders: parsed.orders || [],
      order_items: parsed.order_items || [],
      next_order_item_id: parsed.next_order_item_id || 1,
    };
  } catch {
    const initial = seedData();
    writeFileSync(dbPath, JSON.stringify(initial, null, 2));
    return initial;
  }
};

const state = loadData();

const persist = () => {
  writeFileSync(dbPath, JSON.stringify(state, null, 2));
};

const mapOrder = (order, items) => ({
  id: order.id,
  spotId: order.spot_id,
  userId: order.user_id,
  totalAmount: order.total_amount,
  createdAt: order.created_at,
  items: items.map((item) => ({
    productId: item.product_id,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    total: item.total,
  })),
});

export const database = {
  getUserByCredentials(username, password) {
    const user = state.users.find((entry) => entry.username === username);

    if (!user || !verifyPassword(password, user.password)) {
      return null;
    }

    if (!user.password.startsWith(HASH_PREFIX)) {
      user.password = hashPassword(password);
      persist();
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };
  },

  getCatalog() {
    return state.catalog_items.reduce(
      (acc, row) => {
        if (!acc[row.category]) {
          acc[row.category] = [];
        }

        acc[row.category].push({
          id: row.id,
          name: row.name,
          price: row.price,
        });

        return acc;
      },
      { drinks: [], food: [], cigarettes: [] }
    );
  },

  getUserById(userId) {
    const user = state.users.find((entry) => entry.id === userId);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    };
  },

  userExists(userId) {
    return state.users.some((user) => user.id === userId);
  },

  spotExists(spotId) {
    return state.spots.some((spot) => spot.id === spotId);
  },

  getSpots() {
    return state.spots
      .map((spot) => ({
        id: spot.id,
        location: spot.location,
        date: spot.date,
        hostUserId: spot.host_user_id,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  getSpotsBetween({ fromInclusive, toInclusive }) {
    const fromValue = fromInclusive ? new Date(fromInclusive).getTime() : Number.NEGATIVE_INFINITY;
    const toValue = toInclusive ? new Date(toInclusive).getTime() : Number.POSITIVE_INFINITY;

    return state.spots
      .filter((spot) => {
        const timestamp = new Date(spot.date).getTime();
        return timestamp >= fromValue && timestamp <= toValue;
      })
      .map((spot) => ({
        id: spot.id,
        location: spot.location,
        date: spot.date,
        hostUserId: spot.host_user_id,
      }));
  },

  // UPDATED: now supports from, to (date range on createdAt) and sort (asc/desc)
  getOrders({ spotId, userId, from, to, sort = 'desc' }) {
    const fromTime = from ? new Date(from).getTime() : null;
    const toTime = to ? new Date(to).getTime() : null;

    const orders = state.orders
      .filter((order) => !spotId || order.spot_id === spotId)
      .filter((order) => !userId || order.user_id === userId)
      .filter((order) => !fromTime || new Date(order.created_at).getTime() >= fromTime)
      .filter((order) => !toTime || new Date(order.created_at).getTime() <= toTime)
      .sort((a, b) =>
        sort === 'asc'
          ? a.created_at.localeCompare(b.created_at)
          : b.created_at.localeCompare(a.created_at)
      );

    return orders.map((order) => {
      const orderItems = state.order_items.filter((item) => item.order_id === order.id);
      return mapOrder(order, orderItems);
    });
  },

  getOrderById(orderId) {
    const order = state.orders.find((entry) => entry.id === orderId);

    if (!order) {
      return null;
    }

    const orderItems = state.order_items
      .filter((item) => item.order_id === order.id)
      .sort((a, b) => a.id - b.id);

    return mapOrder(order, orderItems);
  },

  createOrder({ spotId, userId, items }) {
    const parsedItems = items.map((item) => {
      const quantity = Number(item.quantity || 0);
      if (!item.productId || !Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Each order item must include productId and a positive integer quantity');
      }

      const catalogItem = state.catalog_items.find((entry) => entry.id === item.productId);
      if (!catalogItem) {
        throw new Error(`Unknown productId: ${item.productId}`);
      }

      return {
        productId: catalogItem.id,
        name: catalogItem.name,
        quantity,
        unitPrice: catalogItem.price,
        total: quantity * catalogItem.price,
      };
    });

    const totalAmount = parsedItems.reduce((sum, item) => sum + item.total, 0);
    const orderId = randomUUID();
    const createdAt = new Date().toISOString();

    state.orders.push({
      id: orderId,
      spot_id: spotId,
      user_id: userId,
      total_amount: totalAmount,
      created_at: createdAt,
    });

    parsedItems.forEach((item) => {
      state.order_items.push({
        id: state.next_order_item_id++,
        order_id: orderId,
        product_id: item.productId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total,
      });
    });

    persist();

    return {
      id: orderId,
      spotId,
      userId,
      items: parsedItems,
      totalAmount,
      createdAt,
    };
  },

  deleteUserCompletely(userId) {
    const hostedSpotIds = new Set(state.spots.filter((spot) => spot.host_user_id === userId).map((spot) => spot.id));

    state.users = state.users.filter((user) => user.id !== userId);
    state.orders = state.orders.filter((order) => order.user_id !== userId && !hostedSpotIds.has(order.spot_id));
    const activeOrderIds = new Set(state.orders.map((order) => order.id));
    state.order_items = state.order_items.filter((item) => activeOrderIds.has(item.order_id));
    state.spots = state.spots.filter((spot) => spot.host_user_id !== userId);

    persist();
  },

  getBillBySpotId(spotId) {
    const summaryRows = state.orders.filter((order) => order.spot_id === spotId);

    const total = summaryRows.reduce((sum, row) => sum + row.total_amount, 0);
    const userTotals = summaryRows.reduce((acc, row) => {
      acc[row.user_id] = (acc[row.user_id] || 0) + row.total_amount;
      return acc;
    }, {});

    return {
      spotId,
      total,
      userTotals,
      orderCount: summaryRows.length,
    };
  },

  cleanupExpiredSpots(referenceDate = new Date().toISOString()) {
    const referenceTimestamp = new Date(referenceDate).getTime();
    const expiredSpotIds = new Set(
      state.spots
        .filter((spot) => new Date(spot.date).getTime() < referenceTimestamp)
        .map((spot) => spot.id)
    );

    if (expiredSpotIds.size === 0) {
      return { removedSpotCount: 0, removedOrderCount: 0, removedOrderItemCount: 0 };
    }

    const previousOrderCount = state.orders.length;
    const previousOrderItemCount = state.order_items.length;

    state.spots = state.spots.filter((spot) => !expiredSpotIds.has(spot.id));
    state.orders = state.orders.filter((order) => !expiredSpotIds.has(order.spot_id));
    const activeOrderIds = new Set(state.orders.map((order) => order.id));
    state.order_items = state.order_items.filter((item) => activeOrderIds.has(item.order_id));

    persist();

    return {
      removedSpotCount: expiredSpotIds.size,
      removedOrderCount: previousOrderCount - state.orders.length,
      removedOrderItemCount: previousOrderItemCount - state.order_items.length,
    };
  },
};

export { dbPath };