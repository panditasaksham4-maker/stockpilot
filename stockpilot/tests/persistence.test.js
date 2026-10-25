const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Database Persistence Across Restarts Test Suite', () => {
  const testDbFile = path.resolve(__dirname, 'test_persistence_disk.sqlite');

  before(() => {
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
    }
  });

  after(() => {
    if (fs.existsSync(testDbFile)) {
      try { fs.unlinkSync(testDbFile); } catch {}
    }
    const walFile = `${testDbFile}-wal`;
    const shmFile = `${testDbFile}-shm`;
    if (fs.existsSync(walFile)) { try { fs.unlinkSync(walFile); } catch {} }
    if (fs.existsSync(shmFile)) { try { fs.unlinkSync(shmFile); } catch {} }
  });

  test('Persistence: Product data persists across application/database restarts', () => {
    // Phase 1: Initialize database at persistent path
    let Engine;
    try {
      Engine = require('better-sqlite3');
    } catch {
      const { DatabaseSync } = require('node:sqlite');
      Engine = DatabaseSync;
    }

    let dbInstance = new Engine(testDbFile);
    const schemaSql = fs.readFileSync(path.resolve(__dirname, '../src/database/schema.sql'), 'utf8');
    dbInstance.exec(schemaSql);

    // Insert a product
    const testSku = 9901;
    const testName = 'Persistent Industrial Controller';
    const testCategory = 'Automation';
    const testQty = 42;
    const testPrice = 850.50;
    const now = new Date().toISOString();

    const insertStmt = dbInstance.prepare(`
      INSERT INTO products (product_id, name, category, quantity, price, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(testSku, testName, testCategory, testQty, testPrice, 'Persisted across reboots', now, now);

    // Verify written
    const readStmt1 = dbInstance.prepare('SELECT * FROM products WHERE product_id = ?');
    const row1 = readStmt1.get(testSku);
    assert.equal(row1.name, testName);
    assert.equal(row1.quantity, testQty);

    // Phase 2: Simulate Application Shutdown (close connection)
    dbInstance.close();

    // Verify file still exists on disk
    assert.ok(fs.existsSync(testDbFile), 'SQLite database file must persist on disk after close');

    // Phase 3: Simulate Application Restart (reconnect to same persistent file)
    let restartedDb = new Engine(testDbFile);

    // Idempotent schema run (same as app startup)
    restartedDb.exec(schemaSql);

    // Read the product from restarted database
    const readStmt2 = restartedDb.prepare('SELECT * FROM products WHERE product_id = ?');
    const row2 = readStmt2.get(testSku);

    assert.ok(row2, 'Product record must survive application restart');
    assert.equal(row2.product_id, testSku);
    assert.equal(row2.name, testName);
    assert.equal(row2.category, testCategory);
    assert.equal(row2.quantity, testQty);
    assert.equal(row2.price, testPrice);

    // Modify stock in restarted session
    const updateStmt = restartedDb.prepare('UPDATE products SET quantity = quantity + 10 WHERE product_id = ?');
    updateStmt.run(testSku);

    // Close again (second restart)
    restartedDb.close();

    // Reopen to verify modified state persisted
    let secondRestartDb = new Engine(testDbFile);
    const row3 = secondRestartDb.prepare('SELECT quantity FROM products WHERE product_id = ?').get(testSku);
    assert.equal(row3.quantity, 52);

    secondRestartDb.close();
  });
});
