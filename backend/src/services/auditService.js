const { query } = require('../config/db');

/**
 * Log audit events to audit_logs table
 * @param {Object} options
 * @param {number|null} options.userId - User performing the action
 * @param {string} options.action - e.g. 'MARK_ATTENDANCE', 'UPDATE_ATTENDANCE', 'CREATE_USER'
 * @param {string} options.entity - Target table/domain
 * @param {number|null} options.entityId - Primary ID of affected record
 * @param {Object} [options.details] - Arbitrary structured payload
 * @param {Object} [options.req] - Express request object for IP and User-Agent extraction
 */
async function logAudit({ userId = null, action, entity, entityId = null, details = {}, req = null }) {
  try {
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
      userAgent = req.headers['user-agent'] || null;
    }

    const detailsJson = JSON.stringify(details);

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, action, entity, entityId, detailsJson, ipAddress, userAgent]
    );
  } catch (err) {
    // Non-blocking error logging for audit trail to ensure primary request flow remains reliable
    console.error('Audit log recording failed:', err.message);
  }
}

/**
 * Retrieve recent audit logs with pagination and filters
 */
async function getAuditLogs({ limit = 50, offset = 0, action = null, entity = null } = {}) {
  let sql = `
    SELECT a.*, u.email as user_email, u.role as user_role, u.first_name, u.last_name
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (action) {
    sql += ' AND a.action = ?';
    params.push(action);
  }

  if (entity) {
    sql += ' AND a.entity = ?';
    params.push(entity);
  }

  sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  return await query(sql, params);
}

module.exports = {
  logAudit,
  getAuditLogs
};
