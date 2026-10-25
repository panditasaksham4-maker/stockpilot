const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const auditService = require('../services/audit.service');

/**
 * GET /api/audit
 * View system audit logs with pagination and filtering
 * Required permission: audit.view
 */
router.get('/', authenticate, authorize('audit.view'), (req, res) => {
  try {
    const { page, limit, search, action, outcome } = req.query;
    const result = auditService.getLogs({
      page,
      limit,
      search,
      action,
      outcome
    });
    return res.json(result);
  } catch (err) {
    console.error('Audit logs error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/audit
 * Clear entire audit history (Super Administrator only)
 */
router.delete('/', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: Only Super Administrators can clear audit history.' });
    }

    auditService.clearAllLogs();
    
    // Log that audit was cleared
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    auditService.log({
      userId: req.user.id,
      username: req.user.username,
      action: 'AUDIT_LOG_CLEARED',
      targetType: 'audit',
      details: 'Audit history purged by administrator',
      ipAddress: clientIp,
      outcome: 'SUCCESS'
    });

    return res.json({ message: 'Audit history cleared successfully.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/audit/:id
 * Delete a specific audit entry by ID (Super Administrator only)
 */
router.delete('/:id', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden: Only Super Administrators can delete audit records.' });
    }

    const id = Number(req.params.id);
    const deleted = auditService.deleteLogById(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Audit record not found.' });
    }

    return res.json({ message: `Audit record #${id} removed.` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
