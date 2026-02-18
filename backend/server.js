import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { dataStore } from './store.js';

const port = Number(process.env.PORT || 4000);

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

      const user = dataStore.users.find((item) => item.username === username && item.password === password);

      if (!user) {
        sendJson(res, 401, { error: 'invalid credentials' });
        return;
      }

      const { password: _password, ...publicUser } = user;
      sendJson(res, 200, { token: `demo-token-${user.id}`, user: publicUser });
      return;
    } catch (error) {
      sendJson(res, 400, { error: error.message });
      return;
    }
  }

  if (method === 'GET' && path === '/api/catalog') {
    sendJson(res, 200, dataStore.catalog);
    return;
  }

  if (method === 'GET' && path.startsWith('/api/catalog/')) {
    const category = path.replace('/api/catalog/', '');
    const items = dataStore.catalog[category];

    if (!items) {
      sendJson(res, 404, { error: `Unknown category: ${category}` });
      return;
    }

    sendJson(res, 200, items);
    return;
  }

  if (method === 'GET' && path === '/api/spots') {
    sendJson(res, 200, dataStore.spots);
    return;
  }

  if (method === 'GET' && path === '/api/orders') {
    const spotId = parsedUrl.searchParams.get('spotId');
    const userId = parsedUrl.searchParams.get('userId');

    const filteredOrders = dataStore.orders.filter((order) => {
      if (spotId && order.spotId !== spotId) return false;
      if (userId && order.userId !== userId) return false;
      return true;
    });

    sendJson(res, 200, filteredOrders);
    return;
  }

  if (method === 'POST' && path === '/api/orders') {
    try {
      const { spotId, userId, items } = await readBody(req);

      if (!spotId || !userId || !Array.isArray(items) || items.length === 0) {
        sendJson(res, 400, { error: 'spotId, userId and at least one order item are required' });
        return;
      }

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
      const newOrder = {
        id: randomUUID(),
        spotId,
        userId,
        items: parsedItems,
        totalAmount,
        createdAt: new Date().toISOString(),
      };

      dataStore.orders.push(newOrder);
      sendJson(res, 201, newOrder);
      return;
    } catch (error) {
      sendJson(res, 400, { error: error.message });
      return;
    }
  }

  if (method === 'GET' && path.startsWith('/api/bills/')) {
    const spotId = path.replace('/api/bills/', '');
    const orders = dataStore.orders.filter((order) => order.spotId === spotId);

    const userTotals = orders.reduce((acc, order) => {
      acc[order.userId] = (acc[order.userId] || 0) + order.totalAmount;
      return acc;
    }, {});

    const total = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    sendJson(res, 200, {
      spotId,
      total,
      userTotals,
      orderCount: orders.length,
    });
    return;
  }

  sendJson(res, 404, { error: 'Route not found' });
});

server.listen(port, () => {
  console.log(`Backend API running on http://localhost:${port}`);
});
