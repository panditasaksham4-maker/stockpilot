const path = require('path');
const fs = require('fs');

const testDbPath = path.resolve(__dirname, 'test_rbac.sqlite');
process.env.DATABASE_PATH = testDbPath;

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const db = require('../src/database/db');
const permissionsService = require('../src/services/permissions.service');
const auditService = require('../src/services/audit.service');

describe('Security & RBAC Authorization Test Suite', () => {
  before(() => {
    // Seed test users in test database
    const salt = bcrypt.genSaltSync(10);
    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT OR IGNORE INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `);
    insert.run('admin', 'Admin User', 'admin@test.local', bcrypt.hashSync('Admin@12345', salt), 'super_admin', now, now);
    insert.run('manager', 'Manager User', 'manager@test.local', bcrypt.hashSync('Manager@12345', salt), 'inventory_manager', now, now);
    insert.run('viewer', 'Viewer User', 'viewer@test.local', bcrypt.hashSync('Viewer@12345', salt), 'viewer', now, now);
    insert.run('auditor', 'Auditor User', 'auditor@test.local', bcrypt.hashSync('Auditor@12345', salt), 'custom', now, now);
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

  test('Security: User passwords in SQLite are securely hashed with bcrypt', () => {
    const adminUser = db.prepare("SELECT password_hash FROM users WHERE username = 'admin'").get();
    assert.ok(adminUser, 'Admin user must exist');
    assert.notEqual(adminUser.password_hash, 'Admin@12345', 'Password must NEVER be stored in plain text');
    assert.ok(adminUser.password_hash.startsWith('$2a$') || adminUser.password_hash.startsWith('$2b$'), 'Password must be valid bcrypt hash');
    assert.equal(bcrypt.compareSync('Admin@12345', adminUser.password_hash), true);
  });

  test('RBAC: Super Administrator inherently holds all 13 system permissions', () => {
    const adminUser = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
    const effectivePerms = permissionsService.getUserEffectivePermissions(adminUser.id);
    const allPerms = permissionsService.getAllPermissions().map(p => p.id);

    assert.equal(effectivePerms.length, allPerms.length);
    assert.ok(effectivePerms.includes('inventory.delete'));
    assert.ok(effectivePerms.includes('permissions.manage'));
    assert.ok(effectivePerms.includes('users.create'));
  });

  test('RBAC: Inventory Manager has view, create, update, and adjust stock, but NOT delete', () => {
    const managerUser = db.prepare("SELECT id FROM users WHERE username = 'manager'").get();
    const perms = permissionsService.getUserEffectivePermissions(managerUser.id);

    assert.ok(perms.includes('inventory.view'));
    assert.ok(perms.includes('inventory.search'));
    assert.ok(perms.includes('inventory.create'));
    assert.ok(perms.includes('inventory.update'));
    assert.ok(perms.includes('inventory.adjust_stock'));
    assert.equal(perms.includes('inventory.delete'), false, 'Inventory Manager MUST NOT have delete permission');
    assert.equal(perms.includes('users.create'), false);
    assert.equal(perms.includes('permissions.manage'), false);
  });

  test('RBAC: Viewer role has view & search only; cannot create, update, or delete', () => {
    const viewerUser = db.prepare("SELECT id FROM users WHERE username = 'viewer'").get();
    const perms = permissionsService.getUserEffectivePermissions(viewerUser.id);

    assert.ok(perms.includes('inventory.view'));
    assert.ok(perms.includes('inventory.search'));
    assert.equal(perms.includes('inventory.create'), false);
    assert.equal(perms.includes('inventory.update'), false);
    assert.equal(perms.includes('inventory.delete'), false);
    assert.equal(perms.includes('inventory.adjust_stock'), false);
  });

  test('Security: Prevent user from self-modifying or elevating their own permissions', () => {
    const managerUser = db.prepare("SELECT id FROM users WHERE username = 'manager'").get();
    assert.throws(() => {
      // Manager attempts to assign themselves permissions
      permissionsService.assignUserPermissions(managerUser.id, ['inventory.delete'], managerUser.id);
    }, /Users cannot modify their own permissions/);
  });

  test('Security: Revoking and granting permissions takes immediate effect on subsequent calls', () => {
    const testCustomUser = db.prepare("SELECT id FROM users WHERE username = 'auditor'").get();

    // Grant inventory.delete to auditor
    permissionsService.assignUserPermissions(testCustomUser.id, ['inventory.view', 'inventory.delete'], 1);
    let perms = permissionsService.getUserEffectivePermissions(testCustomUser.id);
    assert.ok(perms.includes('inventory.delete'), 'Auditor should now have inventory.delete');

    // Revoke inventory.delete
    permissionsService.assignUserPermissions(testCustomUser.id, ['inventory.view'], 1);
    perms = permissionsService.getUserEffectivePermissions(testCustomUser.id);
    assert.equal(perms.includes('inventory.delete'), false, 'Auditor must no longer have inventory.delete');
  });

  test('Security: Deactivating an account immediately strips effective permissions', () => {
    // Temporarily deactivate viewer
    const viewerUser = db.prepare("SELECT id FROM users WHERE username = 'viewer'").get();
    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(viewerUser.id);

    const perms = permissionsService.getUserEffectivePermissions(viewerUser.id);
    assert.equal(perms.length, 0, 'Deactivated account must have 0 effective permissions');

    // Reactivate
    db.prepare('UPDATE users SET is_active = 1 WHERE id = ?').run(viewerUser.id);
    const restoredPerms = permissionsService.getUserEffectivePermissions(viewerUser.id);
    assert.ok(restoredPerms.length > 0, 'Reactivated user regains role permissions');
  });

  test('Audit: Security and authorization events are recorded in audit logs', () => {
    auditService.log({
      userId: 99,
      username: 'hacker',
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      targetType: 'permission',
      targetId: 'inventory.delete',
      details: 'Direct API request attempted without permission',
      outcome: 'DENIED'
    });

    const recent = auditService.getLogs({ limit: 5, action: 'UNAUTHORIZED_ACCESS_ATTEMPT' });
    assert.ok(recent.logs.length > 0);
    assert.equal(recent.logs[0].action, 'UNAUTHORIZED_ACCESS_ATTEMPT');
    assert.equal(recent.logs[0].outcome, 'DENIED');
  });
});
