const auditService = require('../services/audit.service');

/**
 * Authorization Middleware Factory
 * Checks whether the authenticated user holds the required fine-grained permission.
 * Super Administrators bypass individual checks.
 *
 * Automatically records unauthorized modification attempts to the security audit log.
 *
 * @param {string} requiredPermission - Permission string identifier (e.g., 'inventory.create')
 */
function authorize(requiredPermission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required prior to permission evaluation.',
        code: 'UNAUTHENTICATED'
      });
    }

    // Super Admin has unrestricted system privileges
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check if user's effective permissions include the requested permission
    const hasPermission = Array.isArray(req.user.permissions) && req.user.permissions.includes(requiredPermission);

    if (hasPermission) {
      return next();
    }

    // Log the unauthorized attempt to the audit log
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    auditService.log({
      userId: req.user.id,
      username: req.user.username,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      targetType: 'permission',
      targetId: requiredPermission,
      details: {
        path: req.originalUrl,
        method: req.method,
        requiredPermission,
        userRole: req.user.role
      },
      ipAddress: clientIp,
      outcome: 'DENIED'
    });

    return res.status(403).json({
      error: `Forbidden: You lack the required permission (${requiredPermission}) to perform this action.`,
      code: 'PERMISSION_DENIED',
      requiredPermission
    });
  };
}

module.exports = authorize;
