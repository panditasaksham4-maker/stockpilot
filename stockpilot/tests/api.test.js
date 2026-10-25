const path = require('path');
const fs = require('fs');

const testDbPath = path.resolve(__dirname, 'test_api.sqlite');
process.env.DATABASE_PATH = testDbPath;

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const app = require('../src/server');

describe('HTTP API Endpoints & RBAC Integration Test Suite', () => {
  let server;
  let baseUrl;

  before((_, done) => {
    const db = require('../src/database/db');
    const bcrypt = require('bcryptjs');
    const salt = bcrypt.genSaltSync(10);
    const now = new Date().toISOString();

    const insert = db.prepare(`
      INSERT OR IGNORE INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `);
    insert.run('admin', 'Admin User', 'admin@test.local', bcrypt.hashSync('Admin@12345', salt), 'super_admin', now, now);
    insert.run('manager', 'Manager User', 'manager@test.local', bcrypt.hashSync('Manager@12345', salt), 'inventory_manager', now, now);
    insert.run('viewer', 'Viewer User', 'viewer@test.local', bcrypt.hashSync('Viewer@12345', salt), 'viewer', now, now);

    // Ensure sample product 101 exists for testing search
    const inventoryService = require('../src/services/inventory.service');
    const existing101 = db.prepare('SELECT product_id FROM products WHERE product_id = 101').get();
    if (!existing101) {
      db.prepare(`
        INSERT INTO products (product_id, name, category, quantity, price, description, created_at, updated_at)
        VALUES (101, 'Precision Caliper Gauge', 'Hardware', 145, 89.99, 'Test Caliper', ?, ?)
      `).run(now, now);
      inventoryService.refreshMemoryArray();
    }

    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  after((_, done) => {
    if (server) {
      server.close(() => {
        try {
          const db = require('../src/database/db');
          db.close();
          if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
          const wal = `${testDbPath}-wal`;
          const shm = `${testDbPath}-shm`;
          if (fs.existsSync(wal)) fs.unlinkSync(wal);
          if (fs.existsSync(shm)) fs.unlinkSync(shm);
        } catch {}
        done();
      });
    } else {
      done();
    }
  });

  // Helper function to send HTTP requests with cookie handling
  async function apiRequest(method, endpoint, body = null, cookie = null) {
    const url = new URL(endpoint, baseUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const options = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), options);
    let json = null;
    try {
      json = await response.json();
    } catch {
      // not json
    }

    const setCookie = response.headers.get('set-cookie');
    let sessionCookie = cookie;
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
    }

    return {
      status: response.status,
      body: json,
      cookie: sessionCookie
    };
  }

  test('Security: Unauthenticated request to protected endpoint receives HTTP 401 Unauthorized', async () => {
    const res = await apiRequest('GET', '/api/inventory');
    assert.equal(res.status, 401);
    assert.match(res.body.error, /Authentication required/);
  });

  test('Security: Direct unauthenticated POST request receives HTTP 401 Unauthorized', async () => {
    const res = await apiRequest('POST', '/api/inventory', {
      productId: 7771,
      name: 'Hacker Product',
      category: 'Exploit',
      quantity: 1,
      price: 10
    });
    assert.equal(res.status, 401);
  });

  test('RBAC: Viewer logs in, can view & search, but cannot create or delete (HTTP 403 Forbidden)', async () => {
    // 1. Login as viewer
    const loginRes = await apiRequest('POST', '/api/auth/login', {
      username: 'viewer',
      password: 'Viewer@12345'
    });
    assert.equal(loginRes.status, 200);
    const viewerCookie = loginRes.cookie;
    assert.ok(viewerCookie, 'Session cookie must be set');

    // 2. Viewer can view inventory
    const viewRes = await apiRequest('GET', '/api/inventory', null, viewerCookie);
    assert.equal(viewRes.status, 200);
    assert.ok(Array.isArray(viewRes.body.items));

    // 3. Viewer can search inventory
    const searchRes = await apiRequest('GET', '/api/inventory/search?algorithm=both&productId=101', null, viewerCookie);
    assert.equal(searchRes.status, 200);
    assert.equal(searchRes.body.found, true);

    // 4. Viewer CANNOT create product (HTTP 403)
    const createRes = await apiRequest('POST', '/api/inventory', {
      productId: 7772,
      name: 'Unauthorized Product',
      category: 'Illegal',
      quantity: 10,
      price: 50
    }, viewerCookie);
    assert.equal(createRes.status, 403);
    assert.equal(createRes.body.code, 'PERMISSION_DENIED');
    assert.equal(createRes.body.requiredPermission, 'inventory.create');

    // 5. Viewer CANNOT delete product (HTTP 403)
    const deleteRes = await apiRequest('DELETE', '/api/inventory/101', null, viewerCookie);
    assert.equal(deleteRes.status, 403);
    assert.equal(deleteRes.body.code, 'PERMISSION_DENIED');
    assert.equal(deleteRes.body.requiredPermission, 'inventory.delete');
  });

  test('RBAC: Inventory Manager can create & update, but CANNOT delete products (HTTP 403)', async () => {
    // 1. Login as manager
    const loginRes = await apiRequest('POST', '/api/auth/login', {
      username: 'manager',
      password: 'Manager@12345'
    });
    assert.equal(loginRes.status, 200);
    const managerCookie = loginRes.cookie;

    // 2. Manager CAN create product
    const tempSku = 7773;
    const createRes = await apiRequest('POST', '/api/inventory', {
      productId: tempSku,
      name: 'Manager Authorized SKU',
      category: 'Peripherals',
      quantity: 15,
      price: 79.99,
      description: 'Created by manager'
    }, managerCookie);
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.product.name, 'Manager Authorized SKU');

    // 3. Manager CAN update product
    const updateRes = await apiRequest('PUT', `/api/inventory/${tempSku}`, {
      name: 'Manager Authorized SKU (Updated)',
      category: 'Peripherals',
      quantity: 20,
      price: 84.99
    }, managerCookie);
    assert.equal(updateRes.status, 200);

    // 4. Manager CANNOT delete product (HTTP 403)
    const deleteRes = await apiRequest('DELETE', `/api/inventory/${tempSku}`, null, managerCookie);
    assert.equal(deleteRes.status, 403);
    assert.equal(deleteRes.body.requiredPermission, 'inventory.delete');

    // 5. Manager CANNOT view audit logs (HTTP 403)
    const auditRes = await apiRequest('GET', '/api/audit', null, managerCookie);
    assert.equal(auditRes.status, 403);
    assert.equal(auditRes.body.requiredPermission, 'audit.view');
  });

  test('RBAC: Super Administrator has full deletion and audit access', async () => {
    // 1. Login as admin
    const loginRes = await apiRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'Admin@12345'
    });
    assert.equal(loginRes.status, 200);
    const adminCookie = loginRes.cookie;

    // 2. Admin can view audit logs
    const auditRes = await apiRequest('GET', '/api/audit', null, adminCookie);
    assert.equal(auditRes.status, 200);
    assert.ok(Array.isArray(auditRes.body.logs));

    // 3. Admin deletes the temp SKU created earlier
    const delRes = await apiRequest('DELETE', '/api/inventory/7773', null, adminCookie);
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.success, true);
  });
});
