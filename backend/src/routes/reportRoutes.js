const express = require('express');
const router = express.Router();
const { getSubjectReport, getClassReport, exportCsv } = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/rbacMiddleware');

router.use(authenticateToken);
router.use(authorizeRoles('admin', 'faculty'));

router.get('/subject/:subjectId', getSubjectReport);
router.get('/class/:courseId', getClassReport);
router.get('/export/csv', exportCsv);

module.exports = router;
