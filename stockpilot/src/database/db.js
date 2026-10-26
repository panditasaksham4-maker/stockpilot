const path = require('path');
const fs = require('fs');

const APP_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_LOCAL_PATH = path.resolve(APP_ROOT, 'data/stockpilot.db');
const DEFAULT_PROD_PATH = '/var/data/stockpilot.sqlite';

function resolveDatabasePath() {
  if (process.env.DATABASE_PATH && process.env.DATABASE_PATH.trim() !== '') {
    const p = process.env.DATABASE_PATH.trim();
    return path.isAbsolute(p) ? p : path.resolve(APP_ROOT, p);
  }
  if (process.env.DB_PATH && process.env.DB_PATH.trim() !== '') {
    const p = process.env.DB_PATH.trim();
    return path.isAbsolute(p) ? p : path.resolve(APP_ROOT, p);
  }
  if (process.env.NODE_ENV === 'production' && process.platform !== 'win32') {
    // If Render persistent disk /var/data is attached and exists, use it
    if (fs.existsSync('/var/data')) {
      return DEFAULT_PROD_PATH;
    }
  }
  return DEFAULT_LOCAL_PATH;
}

let DB_PATH = resolveDatabasePath();

let dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (err) {
    console.warn(`[StockPilot Database] Could not create directory ${dbDir} (${err.message}). Falling back to local storage.`);
    DB_PATH = DEFAULT_LOCAL_PATH;
    dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      try { fs.mkdirSync(dbDir, { recursive: true }); } catch {}
    }
  }
}

class SqliteDatabase {
  constructor(filePath) {
    let Engine;
    try {
      Engine = require('better-sqlite3');
      this.db = new Engine(filePath);
      this.isBetterSqlite = true;
    } catch {
      const { DatabaseSync } = require('node:sqlite');
      this.db = new DatabaseSync(filePath);
      this.isBetterSqlite = false;
    }
  }

  exec(sql) {
    return this.db.exec(sql);
  }

  pragma(sql) {
    if (this.isBetterSqlite) {
      return this.db.pragma(sql);
    }
    try {
      return this.db.exec(`PRAGMA ${sql};`);
    } catch {
      // PRAGMA fallback
    }
  }

  prepare(sql) {
    const stmt = this.db.prepare(sql);
    return {
      run: (...args) => {
        // If single argument is an object and not an array, convert or pass
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
          return stmt.run(args[0]);
        }
        return stmt.run(...args);
      },
      get: (...args) => {
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
          return stmt.get(args[0]);
        }
        return stmt.get(...args);
      },
      all: (...args) => {
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
          return stmt.all(args[0]);
        }
        return stmt.all(...args);
      }
    };
  }

  transaction(fn) {
    if (this.isBetterSqlite && typeof this.db.transaction === 'function') {
      return this.db.transaction(fn);
    }
    return (...args) => {
      this.exec('BEGIN TRANSACTION;');
      try {
        const result = fn(...args);
        this.exec('COMMIT;');
        return result;
      } catch (err) {
        try {
          this.exec('ROLLBACK;');
        } catch {
          // ignore rollback error if already rolled back
        }
        throw err;
      }
    };
  }

  checkpoint() {
    try {
      if (this.isBetterSqlite) {
        this.db.pragma('wal_checkpoint(PASSIVE)');
      } else {
        this.db.exec('PRAGMA wal_checkpoint(PASSIVE);');
      }
    } catch {
      // ignore pragma checkpoint warning
    }
  }

  close() {
    return this.db.close();
  }
}

const db = new SqliteDatabase(DB_PATH);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  // Seed default Roles if not present
  const countRoles = db.prepare('SELECT COUNT(*) as count FROM roles').get().count;
  if (countRoles === 0) {
    const insertRole = db.prepare('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)');
    insertRole.run('super_admin', 'Super Administrator', 'Full system access, inventory management, user management, and audit logs');
    insertRole.run('inventory_manager', 'Inventory Manager', 'Manages products, updates stock, view and search inventory');
    insertRole.run('viewer', 'Viewer', 'Read-only access to view and search inventory');
    insertRole.run('custom', 'Custom User', 'User with individually assigned granular permissions');
  }

  // Seed default Permissions
  const permissions = [
    // Inventory
    { id: 'inventory.view', name: 'View Inventory', category: 'inventory', description: 'View products list and stock levels' },
    { id: 'inventory.search', name: 'Search Products', category: 'inventory', description: 'Search products using Linear and Binary algorithms' },
    { id: 'inventory.create', name: 'Add Product', category: 'inventory', description: 'Create new product records in the inventory' },
    { id: 'inventory.update', name: 'Update Product', category: 'inventory', description: 'Modify existing product information and details' },
    { id: 'inventory.delete', name: 'Delete Product', category: 'inventory', description: 'Permanently remove products from the inventory' },
    { id: 'inventory.adjust_stock', name: 'Adjust Stock', category: 'inventory', description: 'Perform stock count adjustments and quantity increments' },
    // Users
    { id: 'users.view', name: 'View Users', category: 'users', description: 'View user accounts, roles, and status' },
    { id: 'users.create', name: 'Create Users', category: 'users', description: 'Create new system users and assign roles' },
    { id: 'users.update', name: 'Update Users', category: 'users', description: 'Edit user account details and roles' },
    { id: 'users.deactivate', name: 'Deactivate Users', category: 'users', description: 'Activate or deactivate user accounts' },
    // Permissions
    { id: 'permissions.manage', name: 'Manage Permissions', category: 'permissions', description: 'Grant or revoke fine-grained permissions per user' },
    // Audit
    { id: 'audit.view', name: 'View Audit Logs', category: 'audit', description: 'View system security and activity audit history' },
    // Settings
    { id: 'settings.manage', name: 'Manage Settings', category: 'settings', description: 'Configure system settings such as low-stock thresholds' }
  ];

  const insertPerm = db.prepare(`
    INSERT OR IGNORE INTO permissions (id, name, category, description) 
    VALUES (?, ?, ?, ?)
  `);

  for (const perm of permissions) {
    insertPerm.run(perm.id, perm.name, perm.category, perm.description);
  }

  // Seed Role Permissions (Default mappings)
  const rolePermCount = db.prepare('SELECT COUNT(*) as count FROM role_permissions').get().count;
  if (rolePermCount === 0) {
    const insertRolePerm = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    
    // super_admin: All permissions
    for (const p of permissions) {
      insertRolePerm.run('super_admin', p.id);
    }

    // inventory_manager: View, Search, Create, Update, Adjust Stock
    const managerPerms = [
      'inventory.view',
      'inventory.search',
      'inventory.create',
      'inventory.update',
      'inventory.adjust_stock'
    ];
    for (const pId of managerPerms) {
      insertRolePerm.run('inventory_manager', pId);
    }

    // viewer: View, Search only
    const viewerPerms = [
      'inventory.view',
      'inventory.search'
    ];
    for (const pId of viewerPerms) {
      insertRolePerm.run('viewer', pId);
    }
  }

  // Seed Settings
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('low_stock_threshold', '10');
  insertSetting.run('system_name', 'StockPilot');

  // Safe & Idempotent Product Catalog Initialization
  // Only seeds/restores if the products table is completely empty (0 items).
  // Never drops, resets, or overwrites existing inventory records.
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (productCount === 0) {
    const snapshotPath = path.resolve(__dirname, '../../scripts/database-snapshot.json');
    let seededFromSnapshot = false;

    if (fs.existsSync(snapshotPath)) {
      try {
        const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
        if (Array.isArray(snapshot.products) && snapshot.products.length > 0) {
          const insertProd = db.prepare(`
            INSERT OR IGNORE INTO products (product_id, name, category, quantity, price, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const item of snapshot.products) {
            insertProd.run(
              item.product_id || item.productId,
              item.name,
              item.category,
              item.quantity,
              item.price,
              item.description || '',
              item.created_at || item.createdAt || new Date().toISOString(),
              item.updated_at || item.updatedAt || new Date().toISOString()
            );
          }
          seededFromSnapshot = true;
          console.log(`[StockPilot Database] Restored ${snapshot.products.length} products from snapshot.`);
        }
      } catch (err) {
        console.warn('[StockPilot Database] Snapshot restore notice:', err.message);
      }
    }

    if (!seededFromSnapshot) {
      const defaultProducts = [
        { product_id: 101, name: 'Ergonomic Mechanical Keyboard', category: 'Hardware', quantity: 25, price: 89.99, description: 'Mechanical keyboard with blue switches' },
        { product_id: 102, name: 'Wireless Precision Mouse', category: 'Hardware', quantity: 42, price: 45.50, description: 'Rechargeable wireless ergonomic mouse' },
        { product_id: 103, name: '27-inch 4K UHD Monitor', category: 'Hardware', quantity: 12, price: 349.99, description: 'IPS panel with 99% sRGB color gamut' },
        { product_id: 104, name: 'USB-C Multiport Adapter 7-in-1', category: 'Hardware', quantity: 5, price: 29.99, description: 'Aluminum hub with HDMI, SD, USB 3.0' },
        { product_id: 105, name: 'Gigabit Ethernet Switch 16-Port', category: 'Networking', quantity: 8, price: 119.00, description: 'Unmanaged rackmount network switch' },
        { product_id: 106, name: 'Ultra-Fast 1TB NVMe M.2 SSD', category: 'Storage', quantity: 18, price: 95.00, description: 'PCIe Gen4 solid state drive' },
        { product_id: 107, name: 'Noise-Cancelling Bluetooth Headset', category: 'Hardware', quantity: 0, price: 129.99, description: 'Over-ear headphones with mic' },
        { product_id: 108, name: 'Direct Thermal Barcode Printer', category: 'Hardware', quantity: 3, price: 180.00, description: 'High-speed label printer' },
        { product_id: 109, name: 'Standing Desk Converter 36-inch', category: 'Furniture', quantity: 14, price: 210.00, description: 'Gas-spring height adjustable riser' },
        { product_id: 110, name: 'Cat6 Snagless Patch Cable 10ft', category: 'Networking', quantity: 120, price: 7.99, description: 'Gold-plated RJ45 ethernet cable' }
      ];
      const insertProd = db.prepare(`
        INSERT OR IGNORE INTO products (product_id, name, category, quantity, price, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const now = new Date().toISOString();
      for (const item of defaultProducts) {
        insertProd.run(item.product_id, item.name, item.category, item.quantity, item.price, item.description, now, now);
      }
      console.log(`[StockPilot Database] Seeded ${defaultProducts.length} default catalog products.`);
    }
  }
}

initDatabase();

module.exports = db;
