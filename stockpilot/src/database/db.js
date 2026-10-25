const path = require('path');
const fs = require('fs');

const DEFAULT_LOCAL_PATH = path.join(__dirname, '../../data/stockpilot.db');
const DEFAULT_PROD_PATH = '/var/data/stockpilot.sqlite';

function resolveDatabasePath() {
  if (process.env.DATABASE_PATH && process.env.DATABASE_PATH.trim() !== '') {
    return path.resolve(process.env.DATABASE_PATH.trim());
  }
  if (process.env.DB_PATH && process.env.DB_PATH.trim() !== '') {
    return path.resolve(process.env.DB_PATH.trim());
  }
  if (process.env.NODE_ENV === 'production' && process.platform !== 'win32') {
    return DEFAULT_PROD_PATH;
  }
  return DEFAULT_LOCAL_PATH;
}

const DB_PATH = resolveDatabasePath();

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (err) {
    console.warn(`[StockPilot Database] Could not create directory ${dbDir}: ${err.message}`);
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
}

initDatabase();

module.exports = db;
