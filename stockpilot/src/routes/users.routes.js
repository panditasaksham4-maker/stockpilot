const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const permissionsService = require('../services/permissions.service');
const auditService = require('../services/audit.service');

/**
 * GET /api/users
 * List all users with roles, status, and assigned permissions count
 * Required permission: users.view
 */
router.get('/', authenticate, authorize('users.view'), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.full_name as fullName,
        u.email,
        u.role_id as role,
        r.name as roleName,
        u.is_active as isActive,
        u.created_at as createdAt,
        u.last_login_at as lastLoginAt
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.id ASC
    `).all();

    const usersWithPerms = users.map(u => ({
      ...u,
      isActive: Boolean(u.isActive),
      permissions: permissionsService.getUserEffectivePermissions(u.id)
    }));

    return res.json(usersWithPerms);
  } catch (err) {
    console.error('List users error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/users/meta/roles
 * Retrieve all roles for dropdowns
 */
router.get('/meta/roles', authenticate, authorize('users.view'), (req, res) => {
  return res.json(permissionsService.getAllRoles());
});

/**
 * GET /api/users/meta/permissions
 * Retrieve all permissions categorized for permission matrix
 */
router.get('/meta/permissions', authenticate, authorize('permissions.manage'), (req, res) => {
  return res.json(permissionsService.getAllPermissions());
});

/**
 * GET /api/users/:id
 * Retrieve details and permission breakdown for a specific user
 * Required permission: users.view
 */
router.get('/:id', authenticate, authorize('users.view'), (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.full_name as fullName,
        u.email,
        u.role_id as role,
        r.name as roleName,
        u.is_active as isActive,
        u.created_at as createdAt,
        u.last_login_at as lastLoginAt
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `).get(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const permissionBreakdown = permissionsService.getUserPermissionBreakdown(id);

    return res.json({
      ...user,
      isActive: Boolean(user.isActive),
      permissions: permissionBreakdown
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/users
 * Create a new user account
 * Required permission: users.create
 */
router.post('/', authenticate, authorize('users.create'), (req, res) => {
  try {
    const { username, fullName, email, password, role = 'viewer' } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Role validation
    const validRoles = db.prepare('SELECT id FROM roles').all().map(r => r.id);
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role specified: ${role}` });
    }

    // Security check: Only super_admin can create another super_admin
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      auditService.log({
        userId: req.user.id,
        username: req.user.username,
        action: 'UNAUTHORIZED_PRIVILEGE_ESCALATION',
        targetType: 'user',
        details: 'Attempted to create a super_admin user without super_admin role',
        ipAddress: clientIp,
        outcome: 'DENIED'
      });
      return res.status(403).json({ error: 'Forbidden: Only Super Administrators can create other Super Administrators.' });
    }

    // Check duplicate username or email
    const duplicate = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get(username.trim(), email.trim());
    if (duplicate) {
      if (duplicate.username.toLowerCase() === username.trim().toLowerCase()) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }
      return res.status(400).json({ error: 'Email address is already registered.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `);

    const result = stmt.run(username.trim(), fullName.trim(), email.trim(), passwordHash, role, now, now);
    const newUserId = result.lastInsertRowid;

    auditService.log({
      userId: req.user.id,
      username: req.user.username,
      action: 'USER_CREATE',
      targetType: 'user',
      targetId: newUserId,
      details: { username: username.trim(), email: email.trim(), role },
      ipAddress: clientIp,
      outcome: 'SUCCESS'
    });

    return res.status(201).json({
      message: 'User created successfully.',
      user: {
        id: newUserId,
        username: username.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        role,
        isActive: true
      }
    });
  } catch (err) {
    console.error('Create user error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/users/:id
 * Update user details and role
 * Required permission: users.update
 */
router.put('/:id', authenticate, authorize('users.update'), (req, res) => {
  try {
    const id = Number(req.params.id);
    const { fullName, email, role, password } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const existing = db.prepare('SELECT id, username, full_name, email, role_id, is_active FROM users WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Security check: User cannot self-escalate or change their own role
    if (req.user.id === id && role && role !== req.user.role) {
      auditService.log({
        userId: req.user.id,
        username: req.user.username,
        action: 'UNAUTHORIZED_PRIVILEGE_ESCALATION',
        targetType: 'user',
        details: 'User attempted to change their own role',
        ipAddress: clientIp,
        outcome: 'DENIED'
      });
      return res.status(403).json({ error: 'Security restriction: You cannot modify your own role.' });
    }

    // Security check: If target is last active super_admin and being demoted, prevent!
    if (existing.role_id === 'super_admin' && role && role !== 'super_admin') {
      const activeAdminCount = db.prepare(`
        SELECT COUNT(*) as count FROM users WHERE role_id = 'super_admin' AND is_active = 1
      `).get().count;

      if (activeAdminCount <= 1) {
        return res.status(400).json({
          error: 'Security restriction: Cannot demote the last remaining active Super Administrator.'
        });
      }
    }

    const updatedFullName = fullName ? String(fullName).trim() : existing.full_name;
    const updatedEmail = email ? String(email).trim() : existing.email;
    const updatedRole = role ? String(role).trim() : existing.role_id;
    const now = new Date().toISOString();

    if (password && password.length >= 6) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      db.prepare(`
        UPDATE users 
        SET full_name = ?, email = ?, role_id = ?, password_hash = ?, updated_at = ?
        WHERE id = ?
      `).run(updatedFullName, updatedEmail, updatedRole, hash, now, id);
    } else {
      db.prepare(`
        UPDATE users 
        SET full_name = ?, email = ?, role_id = ?, updated_at = ?
        WHERE id = ?
      `).run(updatedFullName, updatedEmail, updatedRole, now, id);
    }

    auditService.log({
      userId: req.user.id,
      username: req.user.username,
      action: 'USER_UPDATE',
      targetType: 'user',
      targetId: id,
      details: {
        previous: { fullName: existing.full_name, email: existing.email, role: existing.role_id },
        updated: { fullName: updatedFullName, email: updatedEmail, role: updatedRole }
      },
      ipAddress: clientIp,
      outcome: 'SUCCESS'
    });

    return res.json({ message: 'User updated successfully.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/users/:id/status
 * Toggle user active/deactivated state
 * Required permission: users.deactivate
 */
router.patch('/:id/status', authenticate, authorize('users.deactivate'), (req, res) => {
  try {
    const id = Number(req.params.id);
    const { isActive } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const targetUser = db.prepare('SELECT id, username, role_id, is_active FROM users WHERE id = ?').get(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Security check: Cannot deactivate self
    if (req.user.id === id) {
      return res.status(400).json({ error: 'Security restriction: You cannot deactivate your own account.' });
    }

    // Security check: Cannot deactivate last active super admin
    if (targetUser.role_id === 'super_admin' && !isActive) {
      const activeAdminCount = db.prepare(`
        SELECT COUNT(*) as count FROM users WHERE role_id = 'super_admin' AND is_active = 1
      `).get().count;

      if (activeAdminCount <= 1) {
        return res.status(400).json({
          error: 'Security restriction: Cannot deactivate the last remaining active Super Administrator.'
        });
      }
    }

    const newStatus = isActive ? 1 : 0;
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').run(newStatus, now, id);

    auditService.log({
      userId: req.user.id,
      username: req.user.username,
      action: isActive ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
      targetType: 'user',
      targetId: id,
      details: `User ${targetUser.username} set to ${isActive ? 'Active' : 'Deactivated'}`,
      ipAddress: clientIp,
      outcome: 'SUCCESS'
    });

    return res.json({
      message: `User status changed to ${isActive ? 'Active' : 'Deactivated'}.`,
      isActive: Boolean(newStatus)
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/users/:id/permissions
 * Grant or revoke granular permissions for a user
 * Required permission: permissions.manage
 */
router.put('/:id/permissions', authenticate, authorize('permissions.manage'), (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const { permissions } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be provided as an array of permission IDs.' });
    }

    // Enforce: User cannot modify their own permissions!
    if (req.user.id === targetUserId) {
      auditService.log({
        userId: req.user.id,
        username: req.user.username,
        action: 'UNAUTHORIZED_PRIVILEGE_ESCALATION',
        targetType: 'permission',
        details: 'User attempted to assign or edit their own permissions',
        ipAddress: clientIp,
        outcome: 'DENIED'
      });
      return res.status(403).json({
        error: 'Security restriction: You cannot modify your own permissions.'
      });
    }

    const updatedPermissions = permissionsService.assignUserPermissions(targetUserId, permissions, req.user.id);

    auditService.log({
      userId: req.user.id,
      username: req.user.username,
      action: 'PERMISSION_UPDATE',
      targetType: 'user',
      targetId: targetUserId,
      details: {
        assignedPermissions: permissions
      },
      ipAddress: clientIp,
      outcome: 'SUCCESS'
    });

    return res.json({
      message: 'User permissions updated successfully.',
      permissions: updatedPermissions
    });
  } catch (err) {
    console.error('Assign permissions error:', err.message);
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
