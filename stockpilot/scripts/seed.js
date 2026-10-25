require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/database/db');
const inventoryService = require('../src/services/inventory.service');
const auditService = require('../src/services/audit.service');

console.log('--- Seeding StockPilot Database ---');

const salt = bcrypt.genSaltSync(10);
const now = new Date().toISOString();

// 1. Seed Users
const demoUsers = [
  {
    username: 'admin',
    fullName: 'System Administrator',
    email: 'admin@stockpilot.local',
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
    role: 'super_admin'
  },
  {
    username: 'manager',
    fullName: 'Sarah Jenkins',
    email: 'manager@stockpilot.local',
    password: 'Manager@12345',
    role: 'inventory_manager'
  },
  {
    username: 'viewer',
    fullName: 'David Clark',
    email: 'viewer@stockpilot.local',
    password: 'Viewer@12345',
    role: 'viewer'
  },
  {
    username: 'auditor',
    fullName: 'Elena Rostova',
    email: 'auditor@stockpilot.local',
    password: 'Auditor@12345',
    role: 'custom'
  }
];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, 1, ?, ?)
`);

for (const u of demoUsers) {
  const hash = bcrypt.hashSync(u.password, salt);
  insertUser.run(u.username, u.fullName, u.email, hash, u.role, now, now);
}

// 2. Grant Auditor custom permissions
const auditorUser = db.prepare("SELECT id FROM users WHERE username = 'auditor'").get();
if (auditorUser) {
  const customPerms = ['inventory.view', 'inventory.search', 'audit.view'];
  const insertCustom = db.prepare(`
    INSERT OR IGNORE INTO user_permissions (user_id, permission_id, granted_at, granted_by)
    VALUES (?, ?, ?, 1)
  `);
  for (const cp of customPerms) {
    insertCustom.run(auditorUser.id, cp, now);
  }
}

// 3. Seed Products
const demoProducts = [
  { productId: 101, name: 'Ergonomic Mechanical Keyboard', category: 'Peripherals', quantity: 25, price: 89.99, description: 'RGB backlit mechanical keyboard with tactile switches' },
  { productId: 102, name: 'Wireless Precision Mouse', category: 'Peripherals', quantity: 42, price: 45.50, description: 'High DPI ergonomic mouse with rechargeable battery' },
  { productId: 103, name: '27-inch 4K UHD Monitor', category: 'Displays', quantity: 12, price: 349.99, description: 'IPS panel with HDR400 and ultra-thin bezels' },
  { productId: 104, name: 'USB-C Multiport Adapter 7-in-1', category: 'Accessories', quantity: 5, price: 29.99, description: 'HDMI 4K, USB 3.0, and 100W PD charging pass-through' },
  { productId: 105, name: 'Gigabit Ethernet Switch 16-Port', category: 'Networking', quantity: 8, price: 119.00, description: 'Managed gigabit desktop/rackmount switch' },
  { productId: 106, name: 'Ultra-Fast 1TB NVMe M.2 SSD', category: 'Storage', quantity: 18, price: 95.00, description: 'PCIe Gen 4.0 read speeds up to 7000 MB/s' },
  { productId: 107, name: 'Noise-Cancelling Bluetooth Headset', category: 'Audio', quantity: 0, price: 129.99, description: 'Active noise cancellation with dual beamforming microphones' },
  { productId: 108, name: 'Direct Thermal Barcode Printer', category: 'Office Equipment', quantity: 3, price: 180.00, description: 'High-speed 4x6 commercial label and barcode printer' },
  { productId: 109, name: 'Standing Desk Converter 36-inch', category: 'Furniture', quantity: 14, price: 210.00, description: 'Gas spring height adjustable dual-tier tabletop' },
  { productId: 110, name: 'Cat6 Snagless Patch Cable 10ft', category: 'Networking', quantity: 120, price: 7.99, description: 'Shielded twisted pair pure bare copper wire' },
  { productId: 111, name: 'HD 1080p Webcam with Dual Mic', category: 'Peripherals', quantity: 0, price: 59.99, description: 'Auto-focus widescreen video calling camera' },
  { productId: 112, name: 'Laptop Cooling Pad Dual 140mm', category: 'Accessories', quantity: 34, price: 24.50, description: 'Quiet LED cooling stand for laptops up to 17 inches' },
  { productId: 113, name: 'Smart Battery Backup UPS 1500VA', category: 'Hardware', quantity: 7, price: 249.99, description: 'LCD line-interactive surge protection and battery power' },
  { productId: 114, name: 'Ergonomic Mesh Swivel Chair', category: 'Furniture', quantity: 9, price: 289.00, description: 'Adjustable lumbar support with breathable mesh back' },
  { productId: 115, name: 'Dual Heavy-Duty Monitor Desk Mount', category: 'Hardware', quantity: 22, price: 65.00, description: 'Full motion gas spring articulating monitor arms' }
];

const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products (product_id, name, category, quantity, price, description, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const p of demoProducts) {
  insertProduct.run(p.productId, p.name, p.category, p.quantity, p.price, p.description, now, now);
}

// 4. Initial audit logs
auditService.log({
  userId: 1,
  username: 'admin',
  action: 'SYSTEM_SEED',
  targetType: 'system',
  targetId: 'seed',
  details: 'Database seeded with default demo products, roles, and accounts',
  outcome: 'SUCCESS'
});

inventoryService.refreshMemoryArray();

console.log('Seeding completed successfully!');
console.log('Demo Accounts Created:');
console.log('  1. Super Admin:       admin    / Admin@12345   (Full access)');
console.log('  2. Inventory Manager: manager  / Manager@12345 (Create, Edit, Adjust Stock)');
console.log('  3. Viewer:            viewer   / Viewer@12345  (Read-only view & search)');
console.log('  4. Custom User:       auditor  / Auditor@12345 (Audit view & inventory view)');
console.log(`Products in Inventory Array: ${inventoryService.getInventoryArray().length}`);
