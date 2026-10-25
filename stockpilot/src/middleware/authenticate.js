const db = require('../database/db');
const permissionsService = require('../services/permissions.service');

/**
 * Authentication Middleware
 * Enforces valid session and active user verification.
 */
function authenticate(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      error: 'Authentication required. Please log in.',
      code: 'UNAUTHORIZED'
    });
  }

  try {
    const user = db.prepare(`
      SELECT id, username, full_name, email, role_id, is_active
      FROM users
      WHERE id = ?
    `).get(req.session.userId);

    if (!user) {
      req.session.destroy();
      return res.status(401).json({
        error: 'User account not found. Session expired.',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.is_active !== 1) {
      req.session.destroy();
      return res.status(403).json({
        error: 'Forbidden: Your account has been deactivated. Contact an administrator.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Attach user object and effective real-time permissions
    const permissions = permissionsService.getUserEffectivePermissions(user.id);

    req.user = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      role: user.role_id,
      permissions
    };

    next();
  } catch (err) {
    console.error('Authentication middleware error:', err.message);
    return res.status(500).json({ error: 'Internal server authentication error.' });
  }
}

module.exports = authenticate;
