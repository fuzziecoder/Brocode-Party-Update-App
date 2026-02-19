import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const defaultDbPath = resolve(process.cwd(), 'backend', 'data', 'brocode.sqlite');
const dbPath = process.env.BROCODE_DB_PATH ? resolve(process.env.BROCODE_DB_PATH) : defaultDbPath;

const dbDirectory = dirname(dbPath);
if (!existsSync(dbDirectory)) {
  mkdirSync(dbDirectory, { recursive: true });
}

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS spots (
    id TEXT PRIMARY KEY,
    location TEXT NOT NULL,
    date TEXT NOT NULL,
    host_user_id TEXT NOT NULL,
    FOREIGN KEY (host_user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS catalog_items (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    spot_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    total_amount REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (spot_id) REFERENCES spots(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );
`);

const hasUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get().count > 0;

if (!hasUsers) {
  const insertUser = db.prepare('INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)');
  insertUser.run('u-1', 'brocode', 'changeme', 'Ram', 'admin');
  insertUser.run('u-2', 'dhanush', 'changeme', 'Dhanush', 'user');

  const insertSpot = db.prepare('INSERT INTO spots (id, location, date, host_user_id) VALUES (?, ?, ?, ?)');
  insertSpot.run('spot-2025-07-26', 'Attibele Toll Plaza', '2025-07-26T10:00:00.000Z', 'u-1');

  const insertCatalogItem = db.prepare('INSERT INTO catalog_items (id, category, name, price) VALUES (?, ?, ?, ?)');
  insertCatalogItem.run('d-1', 'drinks', 'Brocode Beer', 180);
  insertCatalogItem.run('d-2', 'drinks', 'Kingfisher Beer', 170);
  insertCatalogItem.run('f-1', 'food', 'Beef Biriyani', 220);
  insertCatalogItem.run('f-2', 'food', 'Parotta', 30);
  insertCatalogItem.run('c-1', 'cigarettes', 'Marlboro', 25);
  insertCatalogItem.run('c-2', 'cigarettes', 'Classic', 20);

  db.prepare(
    'INSERT INTO orders (id, spot_id, user_id, total_amount, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run('ord-1', 'spot-2025-07-26', 'u-2', 360, '2025-07-26T10:30:00.000Z');

  db.prepare(
    `INSERT INTO order_items (order_id, product_id, name, quantity, unit_price, total)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run('ord-1', 'd-1', 'Brocode Beer', 2, 180, 360);
}

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

const fetchOrderItemsByOrderIds = (orderIds) => {
  if (orderIds.length === 0) return new Map();

  const placeholders = orderIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT order_id, product_id, name, quantity, unit_price, total
       FROM order_items
       WHERE order_id IN (${placeholders})
       ORDER BY id ASC`
    )
    .all(...orderIds);

  const itemsByOrderId = new Map();
  rows.forEach((row) => {
    if (!itemsByOrderId.has(row.order_id)) {
      itemsByOrderId.set(row.order_id, []);
    }
    itemsByOrderId.get(row.order_id).push(row);
  });

  return itemsByOrderId;
};

export const database = {
  getUserByCredentials(username, password) {
    const user = db
      .prepare('SELECT id, username, name, role FROM users WHERE username = ? AND password = ?')
      .get(username, password);

    return user || null;
  },

  getCatalog() {
    const rows = db.prepare('SELECT id, category, name, price FROM catalog_items ORDER BY category, id').all();
    return rows.reduce(
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

  getCatalogCategory(category) {
    const rows = db.prepare('SELECT id, name, price FROM catalog_items WHERE category = ? ORDER BY id').all(category);
    return rows;
  },

  getSpots() {
    return db
      .prepare('SELECT id, location, date, host_user_id AS hostUserId FROM spots ORDER BY date DESC')
      .all();
  },

  getOrders({ spotId, userId }) {
    const conditions = [];
    const values = [];

    if (spotId) {
      conditions.push('spot_id = ?');
      values.push(spotId);
    }

    if (userId) {
      conditions.push('user_id = ?');
      values.push(userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orders = db
      .prepare(
        `SELECT id, spot_id, user_id, total_amount, created_at
         FROM orders
         ${whereClause}
         ORDER BY created_at DESC`
      )
      .all(...values);

    const itemsByOrderId = fetchOrderItemsByOrderIds(orders.map((order) => order.id));

    return orders.map((order) => mapOrder(order, itemsByOrderId.get(order.id) || []));
  },

  createOrder({ spotId, userId, items }) {
    const parsedItems = items.map((item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);

      return {
        productId: item.productId,
        name: item.name,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      };
    });

    const totalAmount = parsedItems.reduce((sum, item) => sum + item.total, 0);
    const orderId = randomUUID();
    const createdAt = new Date().toISOString();

    const insertOrder = db.prepare(
      'INSERT INTO orders (id, spot_id, user_id, total_amount, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    const insertOrderItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, name, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)'
    );

    db.exec('BEGIN');
    try {
      insertOrder.run(orderId, spotId, userId, totalAmount, createdAt);
      parsedItems.forEach((item) => {
        insertOrderItem.run(orderId, item.productId, item.name, item.quantity, item.unitPrice, item.total);
      });
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    return {
      id: orderId,
      spotId,
      userId,
      items: parsedItems,
      totalAmount,
      createdAt,
    };
  },

  getBillBySpotId(spotId) {
    const summaryRows = db
      .prepare(
        `SELECT user_id, SUM(total_amount) AS total
         FROM orders
         WHERE spot_id = ?
         GROUP BY user_id`
      )
      .all(spotId);

    const total = summaryRows.reduce((sum, row) => sum + row.total, 0);
    const userTotals = summaryRows.reduce((acc, row) => {
      acc[row.user_id] = row.total;
      return acc;
    }, {});

    const orderCount = db.prepare('SELECT COUNT(*) AS count FROM orders WHERE spot_id = ?').get(spotId).count;

    return {
      spotId,
      total,
      userTotals,
      orderCount,
    };
  },
};

export { dbPath };
