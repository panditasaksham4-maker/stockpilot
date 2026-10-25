const db = require('../database/db');

class AuditService {
  /**
   * Log an activity or security event
   */
  log({
    userId = null,
    username = 'anonymous',
    action,
    targetType = null,
    targetId = null,
    details = null,
    ipAddress = '127.0.0.1',
    outcome = 'SUCCESS'
  }) {
    try {
      const timestamp = new Date().toISOString();
      const detailsStr = typeof details === 'object' && details !== null 
        ? JSON.stringify(details) 
        : (details ? String(details) : null);

      const stmt = db.prepare(`
        INSERT INTO audit_logs (timestamp, user_id, username, action, target_type, target_id, details, ip_address, outcome)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        timestamp,
        userId,
        username,
        action,
        targetType,
        targetId ? String(targetId) : null,
        detailsStr,
        ipAddress,
        outcome
      );
    } catch (err) {
      console.error('Failed to write audit log:', err.message);
    }
  }

  /**
   * Query audit logs with pagination and filters
   */
  getLogs({ page = 1, limit = 20, search = '', action = '', outcome = '' } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let whereClauses = [];
    let params = [];

    if (search && search.trim() !== '') {
      const searchWildcard = `%${search.trim()}%`;
      whereClauses.push('(username LIKE ? OR action LIKE ? OR target_id LIKE ? OR details LIKE ?)');
      params.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
    }

    if (action && action.trim() !== '') {
      whereClauses.push('action = ?');
      params.push(action.trim());
    }

    if (outcome && outcome.trim() !== '') {
      whereClauses.push('outcome = ?');
      params.push(outcome.trim());
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = db.prepare(`SELECT COUNT(*) as count FROM audit_logs ${whereSql}`).get(...params);
    const totalRecords = countRow ? countRow.count : 0;
    const totalPages = Math.ceil(totalRecords / limitNum) || 1;

    const logs = db.prepare(`
      SELECT id, timestamp, user_id, username, action, target_type, target_id, details, ip_address, outcome
      FROM audit_logs
      ${whereSql}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    return {
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages
      }
    };
  }

  /**
   * Get recent activity for dashboard
   */
  getRecentActivity(limit = 8) {
    return db.prepare(`
      SELECT id, timestamp, user_id, username, action, target_type, target_id, details, outcome
      FROM audit_logs
      ORDER BY id DESC
      LIMIT ?
    `).all(limit);
  }

  /**
   * Delete an individual audit log by ID
   */
  deleteLogById(id) {
    const stmt = db.prepare('DELETE FROM audit_logs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Clear all audit history
   */
  clearAllLogs() {
    db.prepare('DELETE FROM audit_logs').run();
    return true;
  }
}

module.exports = new AuditService();
