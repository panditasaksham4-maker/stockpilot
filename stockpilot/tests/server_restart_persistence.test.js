const path = require('path');
const fs = require('fs');
const http = require('http');
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const testDbPath = path.resolve(__dirname, 'test_server_restart.sqlite');
process.env.DATABASE_PATH = testDbPath;
process.env.NODE_ENV = 'test';
process.env.PORT = '0';

describe('Server Restart & Website Data Persistence Integration Test (Requirement 15)', () => {
  let serverInstance = null;
  let baseUrl = '';

  function cleanModuleCache() {
    Object.keys(require.cache).forEach((key) => {
      if (key.includes('stockpilot') && key.includes('src')) {
        delete require.cache[key];
      }
    });
  }

  function startServer() {
    return new Promise((resolve, reject) => {
      cleanModuleCache();
      process.env.DATABASE_PATH = testDbPath;
      const app = require('../src/server');
      const server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        serverInstance = server;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve({ server, baseUrl });
      });
      server.on('error', reject);
    });
  }

  function stopServer() {
    return new Promise((resolve) => {
      if (serverInstance) {
        try {
          const db = require('../src/database/db');
          if (typeof db.checkpoint === 'function') db.checkpoint();
          if (typeof db.close === 'function') db.close();
        } catch {}
        serverInstance.close(() => {
          serverInstance = null;
          baseUrl = '';
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  function makeRequest(method, endpoint, body = null, cookie = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, baseUrl);
      const headers = { 'Content-Type': 'application/json' };
      if (cookie) {
        headers['Cookie'] = cookie;
      }

      const req = http.request({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers
      }, (res) => {
        let rawData = '';
        res.on('data', chunk => rawData += chunk);
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
            cookie: res.headers['set-cookie'] ? res.headers['set-cookie'][0].split(';')[0] : cookie
          });
        });
      });

      req.on('error', reject);
      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    });
  }

  before(async () => {
    // Ensure clean state before suite
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
    const wal = `${testDbPath}-wal`;
    const shm = `${testDbPath}-shm`;
    if (fs.existsSync(wal)) { try { fs.unlinkSync(wal); } catch {} }
    if (fs.existsSync(shm)) { try { fs.unlinkSync(shm); } catch {} }
  });

  after(async () => {
    await stopServer();
    if (fs.existsSync(testDbPath)) {
      try { fs.unlinkSync(testDbPath); } catch {}
    }
    const wal = `${testDbPath}-wal`;
    const shm = `${testDbPath}-shm`;
    if (fs.existsSync(wal)) { try { fs.unlinkSync(wal); } catch {} }
    if (fs.existsSync(shm)) { try { fs.unlinkSync(shm); } catch {} }
  });

  test('Requirement 15: Create a product, restart Node.js server, reload website, and verify product/quantity/price persist', async () => {
    // -------------------------------------------------------------
    // Step 1: Start the first server instance
    // -------------------------------------------------------------
    await startServer();

    // Seed test admin user for authenticated API operations
    const db1 = require('../src/database/db');
    const bcrypt = require('bcryptjs');
    const salt = bcrypt.genSaltSync(10);
    const now = new Date().toISOString();
    db1.prepare(`
      INSERT OR IGNORE INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'super_admin', 1, ?, ?)
    `).run('restart_admin', 'Restart Admin', 'restart@test.local', bcrypt.hashSync('Pass@12345', salt), now, now);

    // Login as admin
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      username: 'restart_admin',
      password: 'Pass@12345'
    });
    assert.equal(loginRes.statusCode, 200, 'Login must succeed');
    const authCookie = loginRes.cookie;
    assert.ok(authCookie, 'Must receive session cookie');

    // Create a new product (SKU 7701)
    const productData = {
      productId: 7701,
      name: 'Restart Persistence Testing Controller',
      category: 'Electronics',
      quantity: 85,
      price: 249.99,
      description: 'Verifies data survives server stop and reboot'
    };

    const createRes = await makeRequest('POST', '/api/inventory', productData, authCookie);
    assert.equal(createRes.statusCode, 201, 'Product creation should return 201 Created');
    assert.equal(createRes.body.product.productId, 7701);
    assert.equal(createRes.body.product.quantity, 85);
    assert.equal(createRes.body.product.price, 249.99);

    // -------------------------------------------------------------
    // Step 2: Shutdown Node.js HTTP server completely
    // -------------------------------------------------------------
    await stopServer();
    assert.equal(serverInstance, null, 'Server instance must be terminated');

    // -------------------------------------------------------------
    // Step 3: Restart the Node.js server on the same database
    // -------------------------------------------------------------
    await startServer();
    assert.ok(serverInstance, 'New server instance must be active');

    // Step 4: Simulate user opening/reloading website frontend
    const webRes = await makeRequest('GET', '/inventory.html');
    assert.equal(webRes.statusCode, 200, 'Website frontend must load successfully after restart');

    // Login again on the restarted server
    const reloginRes = await makeRequest('POST', '/api/auth/login', {
      username: 'restart_admin',
      password: 'Pass@12345'
    });
    const newAuthCookie = reloginRes.cookie;

    // Fetch product list (simulating inventory page load)
    const listRes = await makeRequest('GET', '/api/inventory?page=1&limit=50', null, newAuthCookie);
    assert.equal(listRes.statusCode, 200, 'Inventory fetch must succeed');
    assert.ok(Array.isArray(listRes.body.items), 'Should return items array');

    const persistedProduct = listRes.body.items.find(p => p.productId === 7701);
    assert.ok(persistedProduct, 'Product 7701 must still exist after server restart');
    assert.equal(persistedProduct.name, 'Restart Persistence Testing Controller');
    assert.equal(persistedProduct.quantity, 85, 'Product quantity must be preserved after restart');
    assert.equal(persistedProduct.price, 249.99, 'Product price must be preserved after restart');

    // Fetch single product by ID
    const singleRes = await makeRequest('GET', '/api/inventory/7701', null, newAuthCookie);
    assert.equal(singleRes.statusCode, 200);
    assert.equal(singleRes.body.productId, 7701);
    assert.equal(singleRes.body.quantity, 85);
    assert.equal(singleRes.body.price, 249.99);

    // -------------------------------------------------------------
    // Step 5: Update the product in restarted session and verify again
    // -------------------------------------------------------------
    const updateRes = await makeRequest('PUT', '/api/inventory/7701', {
      quantity: 110,
      price: 279.50
    }, newAuthCookie);
    assert.equal(updateRes.statusCode, 200);
    assert.equal(updateRes.body.product.quantity, 110);
    assert.equal(updateRes.body.product.price, 279.50);

    // Restart server a second time
    await stopServer();
    await startServer();

    // Verify updated product survives a second restart
    const reloginRes2 = await makeRequest('POST', '/api/auth/login', {
      username: 'restart_admin',
      password: 'Pass@12345'
    });
    const checkRes = await makeRequest('GET', '/api/inventory/7701', null, reloginRes2.cookie);
    assert.equal(checkRes.statusCode, 200);
    assert.equal(checkRes.body.quantity, 110, 'Updated quantity must survive second restart');
    assert.equal(checkRes.body.price, 279.50, 'Updated price must survive second restart');
  });

  test('Requirement 16: Test searching, stock adjustment, deletion, and backend RBAC permission enforcement', async () => {
    // Login as admin
    const adminLogin = await makeRequest('POST', '/api/auth/login', {
      username: 'restart_admin',
      password: 'Pass@12345'
    });
    const adminCookie = adminLogin.cookie;

    // 1. Stock Adjustment
    const adjustRes = await makeRequest('PATCH', '/api/inventory/7701/stock', {
      adjustmentType: 'add',
      amount: 15,
      reason: 'Warehouse delivery restock'
    }, adminCookie);
    assert.equal(adjustRes.statusCode, 200);
    assert.equal(adjustRes.body.product.quantity, 125, 'Stock adjustment should add 15 to make 125');

    // 2. Search Algorithm (both linear and binary)
    const searchRes = await makeRequest('GET', '/api/inventory/search?algorithm=both&productId=7701', null, adminCookie);
    assert.equal(searchRes.statusCode, 200);
    assert.equal(searchRes.body.targetId, 7701);
    assert.equal(searchRes.body.found, true, 'Search should find target SKU 7701');
    assert.ok(searchRes.body.linear.comparisons >= 1, 'Linear search should report comparisons');
    assert.ok(searchRes.body.binary.comparisons >= 1, 'Binary search should report comparisons');

    // 3. Permission Enforcement Test
    // Seed a viewer-only user without write permissions
    const db = require('../src/database/db');
    const bcrypt = require('bcryptjs');
    const salt = bcrypt.genSaltSync(10);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at)
      VALUES ('restricted_viewer', 'Viewer Person', 'viewer@test.local', ?, 'viewer', 1, ?, ?)
    `).run(bcrypt.hashSync('Viewer@12345', salt), now, now);

    const viewerLogin = await makeRequest('POST', '/api/auth/login', {
      username: 'restricted_viewer',
      password: 'Viewer@12345'
    });
    assert.equal(viewerLogin.statusCode, 200);
    const viewerCookie = viewerLogin.cookie;

    // Viewer can view inventory
    const viewerViewRes = await makeRequest('GET', '/api/inventory/7701', null, viewerCookie);
    assert.equal(viewerViewRes.statusCode, 200, 'Viewer can view product');

    // Viewer CANNOT create product (403 Forbidden)
    const viewerCreate = await makeRequest('POST', '/api/inventory', {
      productId: 8888,
      name: 'Unauthorized Item',
      category: 'Test',
      quantity: 1,
      price: 1
    }, viewerCookie);
    assert.equal(viewerCreate.statusCode, 403, 'Backend authorization must reject unauthorized product creation');

    // Viewer CANNOT update product (403 Forbidden)
    const viewerUpdate = await makeRequest('PUT', '/api/inventory/7701', {
      quantity: 999
    }, viewerCookie);
    assert.equal(viewerUpdate.statusCode, 403, 'Backend authorization must reject unauthorized product updates');

    // Viewer CANNOT adjust stock (403 Forbidden)
    const viewerAdjust = await makeRequest('PATCH', '/api/inventory/7701/stock', {
      adjustmentType: 'subtract',
      amount: 10
    }, viewerCookie);
    assert.equal(viewerAdjust.statusCode, 403, 'Backend authorization must reject unauthorized stock adjustments');

    // Viewer CANNOT delete product (403 Forbidden)
    const viewerDelete = await makeRequest('DELETE', '/api/inventory/7701', null, viewerCookie);
    assert.equal(viewerDelete.statusCode, 403, 'Backend authorization must reject unauthorized product deletion');

    // 4. Authorized Deletion
    const adminDelete = await makeRequest('DELETE', '/api/inventory/7701', null, adminCookie);
    assert.equal(adminDelete.statusCode, 200, 'Super admin can delete product');
    assert.equal(adminDelete.body.success, true);

    // Verify product is gone
    const afterDelete = await makeRequest('GET', '/api/inventory/7701', null, adminCookie);
    assert.equal(afterDelete.statusCode, 404, 'Deleted product must not be found');

    // 5. Restart server again and verify deletion persists
    await stopServer();
    await startServer();

    const reloginAdmin = await makeRequest('POST', '/api/auth/login', {
      username: 'restart_admin',
      password: 'Pass@12345'
    });
    const checkAfterReboot = await makeRequest('GET', '/api/inventory/7701', null, reloginAdmin.cookie);
    assert.equal(checkAfterReboot.statusCode, 404, 'Product deletion must persist across restart');
  });
});
