const { testConnection, query } = require('../config/db');
const { getAuditLogs, logAudit } = require('../services/auditService');

async function healthCheck(req, res) {
  const dbStatus = await testConnection();
  const isHealthy = dbStatus.ok;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    database: {
      connected: dbStatus.ok,
      host: dbStatus.host,
      database: dbStatus.database,
      version: dbStatus.version,
      ssl: dbStatus.sslEnabled || false,
      error: dbStatus.error
    },
    aiConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '')
  });
}

async function getSettings(req, res, next) {
  try {
    const settings = await query('SELECT setting_key, setting_value, description, updated_at FROM system_settings');
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    res.json({
      success: true,
      data: settingsMap,
      raw: settings
    });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Settings object is required' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await query(
        `INSERT INTO system_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
        [key, String(value)]
      );
    }

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_SYSTEM_SETTINGS',
      entity: 'system_settings',
      details: settings,
      req
    });

    res.json({
      success: true,
      message: 'System settings updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function listAuditLogs(req, res, next) {
  try {
    const { page = 1, limit = 50, action, entity } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const logs = await getAuditLogs({ limit, offset, action, entity });
    res.json({
      success: true,
      data: logs
    });
  } catch (err) {
    next(err);
  }
}

async function getNotifications(req, res, next) {
  try {
    const notifs = await query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 30`,
      [req.user.id]
    );

    const unreadCount = notifs.filter(n => !n.is_read).length;

    res.json({
      success: true,
      unreadCount,
      data: notifs
    });
  } catch (err) {
    next(err);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;

    if (id === 'all') {
      await query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
    } else {
      await query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [id, req.user.id]);
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  healthCheck,
  getSettings,
  updateSettings,
  listAuditLogs,
  getNotifications,
  markNotificationRead
};
