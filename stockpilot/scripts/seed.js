require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../src/database/db');
const inventoryService = require('../src/services/inventory.service');
const auditService = require('../src/services/audit.service');

console.log('--- Initializing StockPilot Database ---');

const now = new Date().toISOString();
const snapshotPath = path.resolve(__dirname, 'database-snapshot.json');

if (fs.existsSync(snapshotPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

    // Restore users from snapshot
    if (Array.isArray(data.users)) {
      const insertUser = db.prepare(`
        INSERT OR IGNORE INTO users (id, username, full_name, email, password_hash, role_id, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const u of data.users) {
        insertUser.run(u.id, u.username, u.full_name, u.email, u.password_hash, u.role_id, u.is_active, u.created_at, u.updated_at);
      }
      console.log(`Restored ${data.users.length} users from database snapshot.`);
    }

    // Restore user permissions
    if (Array.isArray(data.user_permissions)) {
      const insertPerm = db.prepare(`
        INSERT OR IGNORE INTO user_permissions (user_id, permission_id, granted_at, granted_by)
        VALUES (?, ?, ?, ?)
      `);
      for (const p of data.user_permissions) {
        insertPerm.run(p.user_id, p.permission_id, p.granted_at, p.granted_by);
      }
    }
  } catch (err) {
    console.error('Snapshot restore warning:', err.message);
  }
} else {
  // Ensure default super_admin account for saksham exists
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('@12345', salt);
  db.prepare(`
    INSERT OR IGNORE INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'super_admin', 1, ?, ?)
  `).run('saksham', 'Saksham', 'saksham@stockpilot.local', hash, now, now);
}

// Ensure products catalog exists
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
if (productCount === 0) {
  const seedProducts = [
    { productId: 101, name: 'Precision Caliper Gauge', category: 'Hardware', quantity: 145, price: 89.99, description: 'Stainless steel digital measuring caliper (0-150mm).' },
    { productId: 104, name: 'Thermal Imaging Sensor', category: 'Electronics', quantity: 8, price: 349.50, description: 'Compact long-wave infrared sensor array.' },
    { productId: 108, name: 'Hydraulic Pressure Regulator', category: 'Pneumatics', quantity: 34, price: 124.00, description: 'Heavy-duty inline flow & pressure regulator valve.' },
    { productId: 112, name: 'Industrial Servo Drive 400W', category: 'Automation', quantity: 0, price: 285.00, description: 'AC synchronous servo drive with EtherCAT interface.' },
    { productId: 115, name: 'High-Torque Stepper Motor', category: 'Electronics', quantity: 72, price: 42.75, description: 'NEMA 23 bipolar 1.8-degree high-holding motor.' },
    { productId: 120, name: 'Optic Fiber Transceiver SFP+', category: 'Networking', quantity: 5, price: 95.00, description: '10GBASE-SR dual LC multimode module.' },
    { productId: 125, name: 'Programmable Logic Controller', category: 'Automation', quantity: 19, price: 599.00, description: 'Modular 24V DC micro PLC with built-in Ethernet.' },
    { productId: 130, name: 'Lithium Iron Battery Module', category: 'Energy', quantity: 12, price: 420.00, description: 'LiFePO4 48V 50Ah rack-mounted energy storage.' },
    { productId: 135, name: 'Ultrasonic Distance Module', category: 'Sensors', quantity: 180, price: 14.50, description: 'Non-contact ultrasonic range finder (2cm - 400cm).' },
    { productId: 142, name: 'Titanium Drill Bit Set (19pc)', category: 'Hardware', quantity: 4, price: 68.20, description: 'HSS titanium nitride coated jobber drill bits.' }
  ];

  for (const item of seedProducts) {
    inventoryService.createProduct(item, 5, 'saksham');
  }
  console.log(`Seeded ${seedProducts.length} default catalog products.`);
}

console.log('StockPilot database is ready.');
