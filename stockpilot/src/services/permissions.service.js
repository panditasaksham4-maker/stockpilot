const db = require('../database/db');

class PermissionsService {
  /**
   * Get all defined permissions in the system, optionally grouped by category
   */
  getAllPermissions() {
    return db.prepare('SELECT id, name, category, description FROM permissions ORDER BY category, id').all();
  }

  /**
   * Get all defined system roles
   */
  getAllRoles() {
    return db.prepare('SELECT id, name, description FROM roles ORDER BY id').all();
  }

  /**
   * Get all permissions assigned to a given role
   */
  getRolePermissions(roleId) {
    const rows = db.prepare(`
      SELECT p.id, p.name, p.category, p.description
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ?
    `).all(roleId);
    return rows.map(r => r.id);
  }

  /**
   * Get the active effective permissions for a user (combining role and custom grants)
   * Super Admins automatically receive all system permissions.
   */
  getUserEffectivePermissions(userId) {
    const user = db.prepare('SELECT id, role_id, is_active FROM users WHERE id = ?').get(userId);
    if (!user || user.is_active !== 1) {
      return [];
    }

    // Super Admin has all permissions
    if (user.role_id === 'super_admin') {
      const allPerms = db.prepare('SELECT id FROM permissions').all();
      return allPerms.map(p => p.id);
    }

    // 1. Role-based permissions
    const rolePermRows = db.prepare(`
      SELECT permission_id FROM role_permissions WHERE role_id = ?
    `).all(user.role_id);
    const permissionsSet = new Set(rolePermRows.map(r => r.permission_id));

    // 2. User-specific custom permissions
    const userCustomRows = db.prepare(`
      SELECT permission_id FROM user_permissions WHERE user_id = ?
    `).all(userId);
    for (const row of userCustomRows) {
      permissionsSet.add(row.permission_id);
    }

    return Array.from(permissionsSet);
  }

  /**
   * Detailed permission inspection for a user (showing role vs custom grants)
   */
  getUserPermissionBreakdown(userId) {
    const user = db.prepare('SELECT id, username, role_id, is_active FROM users WHERE id = ?').get(userId);
    if (!user) {
      return null;
    }

    const allPerms = this.getAllPermissions();
    const rolePerms = new Set(this.getRolePermissions(user.role_id));
    const userCustomRows = db.prepare('SELECT permission_id FROM user_permissions WHERE user_id = ?').all(userId);
    const customPerms = new Set(userCustomRows.map(r => r.permission_id));

    return allPerms.map(p => {
      const fromRole = user.role_id === 'super_admin' || rolePerms.has(p.id);
      const fromCustom = customPerms.has(p.id);
      const isGranted = fromRole || fromCustom;

      return {
        ...p,
        granted: isGranted,
        source: user.role_id === 'super_admin' ? 'super_admin' : (fromRole ? 'role' : (fromCustom ? 'custom' : 'none'))
      };
    });
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(userId, requiredPermission) {
    const permissions = this.getUserEffectivePermissions(userId);
    return permissions.includes(requiredPermission);
  }

  /**
   * Assign or update custom permissions for a specific user
   */
  assignUserPermissions(targetUserId, permissionIds, actingUserId) {
    if (Number(targetUserId) === Number(actingUserId)) {
      throw new Error('Security violation: Users cannot modify their own permissions.');
    }

    const targetUser = db.prepare('SELECT id, username, role_id FROM users WHERE id = ?').get(targetUserId);
    if (!targetUser) {
      throw new Error('Target user does not exist.');
    }

    const allValidPerms = new Set(db.prepare('SELECT id FROM permissions').all().map(p => p.id));
    for (const pId of permissionIds) {
      if (!allValidPerms.has(pId)) {
        throw new Error(`Invalid permission identifier: ${pId}`);
      }
    }

    const updateTx = db.transaction(() => {
      // Clear existing custom permissions
      db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(targetUserId);

      // Insert new custom permissions
      const insertCustom = db.prepare(`
        INSERT INTO user_permissions (user_id, permission_id, granted_at, granted_by)
        VALUES (?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      for (const pId of permissionIds) {
        insertCustom.run(targetUserId, pId, now, actingUserId);
      }
    });

    updateTx();
    return this.getUserEffectivePermissions(targetUserId);
  }
}

module.exports = new PermissionsService();
