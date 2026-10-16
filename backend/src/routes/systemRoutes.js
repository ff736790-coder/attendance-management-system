const express = require('express');
const router = express.Router();
const {
  healthCheck,
  getSettings,
  updateSettings,
  listAuditLogs,
  getNotifications,
  markNotificationRead
} = require('../controllers/systemController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/rbacMiddleware');

// Public health check endpoint
router.get('/health', healthCheck);

// Protected routes
router.use(authenticateToken);

// Notifications
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);

// System Settings
router.get('/settings', authorizeRoles('admin', 'faculty'), getSettings);
router.put('/settings', authorizeRoles('admin'), updateSettings);

// Audit logs
router.get('/audit-logs', authorizeRoles('admin'), listAuditLogs);

module.exports = router;
