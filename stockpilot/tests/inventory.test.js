const path = require('path');
const fs = require('fs');

const testDbPath = path.resolve(__dirname, 'test_inventory.sqlite');
process.env.DATABASE_PATH = testDbPath;

const { test, describe, after } = require('node:test');
const assert = require('node:assert/strict');
const inventoryService = require('../src/services/inventory.service');
const db = require('../src/database/db');

describe('Inventory Functional & Persistence Test Suite', () => {
  const testUser = { id: 1, username: 'admin' };
  const testSku = 8881;

  test('Functional: Successfully add a product to persistent storage and in-memory array', () => {
    // Clean up SKU if exists from prior runs
    db.prepare('DELETE FROM products WHERE product_id = ?').run(testSku);
    inventoryService.refreshMemoryArray();

    const created = inventoryService.createProduct({
      productId: testSku,
      name: 'High-Speed Thermal Sensor',
      category: 'Hardware',
      quantity: 50,
      price: 24.99,
      description: 'Industrial temperature sensor'
    }, testUser);

    assert.equal(created.productId, testSku);
    assert.equal(created.name, 'High-Speed Thermal Sensor');
    assert.equal(created.quantity, 50);

    // Verify in-memory array contains the new item
    const inMem = inventoryService.getInventoryArray().find(p => p.productId === testSku);
    assert.ok(inMem, 'Product should be synchronized in in-memory array');
    assert.equal(inMem.name, 'High-Speed Thermal Sensor');
  });

  test('Functional: Reject duplicate product IDs with clear validation error', () => {
    assert.throws(() => {
      inventoryService.createProduct({
        productId: testSku,
        name: 'Duplicate Sensor Test',
        category: 'Hardware',
        quantity: 10,
        price: 15.00
      }, testUser);
    }, /Validation failed: Product ID 8881 already exists/);
  });

  test('Functional: Reject negative quantities and prices', () => {
    assert.throws(() => {
      inventoryService.createProduct({
        productId: 8882,
        name: 'Invalid Qty Item',
        category: 'Hardware',
        quantity: -5,
        price: 10.00
      }, testUser);
    }, /Validation failed: Quantity must be a non-negative integer/);

    assert.throws(() => {
      inventoryService.createProduct({
        productId: 8883,
        name: 'Invalid Price Item',
        category: 'Hardware',
        quantity: 10,
        price: -9.99
      }, testUser);
    }, /Validation failed: Price must be a non-negative number/);
  });

  test('Functional: Update product details and verify changes in database & array', () => {
    const updated = inventoryService.updateProduct(testSku, {
      name: 'High-Speed Thermal Sensor PRO',
      price: 29.99
    }, testUser);

    assert.equal(updated.name, 'High-Speed Thermal Sensor PRO');
    assert.equal(updated.price, 29.99);

    const inMem = inventoryService.getInventoryArray().find(p => p.productId === testSku);
    assert.equal(inMem.name, 'High-Speed Thermal Sensor PRO');
    assert.equal(inMem.price, 29.99);
  });

  test('Functional: Adjust stock quantity and prevent negative resulting balance', () => {
    // Add 10 units
    const afterAdd = inventoryService.adjustStock(testSku, { adjustmentType: 'add', amount: 10 }, testUser);
    assert.equal(afterAdd.quantity, 60);

    // Subtract 20 units
    const afterSub = inventoryService.adjustStock(testSku, { adjustmentType: 'subtract', amount: 20 }, testUser);
    assert.equal(afterSub.quantity, 40);

    // Try subtracting 100 units (more than 40)
    assert.throws(() => {
      inventoryService.adjustStock(testSku, { adjustmentType: 'subtract', amount: 100 }, testUser);
    }, /Cannot reduce stock below zero/);
  });

  test('Functional: Successfully delete product and update in-memory array', () => {
    const delResult = inventoryService.deleteProduct(testSku, testUser);
    assert.equal(delResult.success, true);

    const inDb = db.prepare('SELECT product_id FROM products WHERE product_id = ?').get(testSku);
    assert.equal(inDb, undefined);

    const inMem = inventoryService.getInventoryArray().find(p => p.productId === testSku);
    assert.equal(inMem, undefined);
  });

  test('Persistence: Re-initializing inventory service restores existing items from SQLite', () => {
    // Add persistent item
    const persistSku = 8889;
    db.prepare('DELETE FROM products WHERE product_id = ?').run(persistSku);
    inventoryService.createProduct({
      productId: persistSku,
      name: 'Persistence Anchor Device',
      category: 'Storage',
      quantity: 15,
      price: 199.99
    }, testUser);

    // Re-create service instance simulating server restart
    const freshService = new (require('../src/services/inventory.service').constructor)();
    const found = freshService.getProductById(persistSku);
    assert.ok(found, 'Persistent product should exist after fresh service instantiation');
    assert.equal(found.name, 'Persistence Anchor Device');

    // Clean up
    freshService.deleteProduct(persistSku, testUser);
  });

  after(() => {
    try {
      db.close();
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      const wal = `${testDbPath}-wal`;
      const shm = `${testDbPath}-shm`;
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch {}
  });
});
