const express = require('express');
const router = express.Router();
const {
  createSession,
  getSessions,
  getSessionById,
  markAttendance,
  updateRecord,
  getStudentSummary
} = require('../controllers/attendanceController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/rbacMiddleware');
const {
  validateCreateSession,
  validateMarkAttendance,
  validateUpdateRecord
} = require('../validators/attendanceValidators');

router.use(authenticateToken);

// Session endpoints
router.post('/sessions', authorizeRoles('admin', 'faculty'), validateCreateSession, createSession);
router.get('/sessions', authorizeRoles('admin', 'faculty', 'student'), getSessions);
router.get('/sessions/:id', authorizeRoles('admin', 'faculty'), getSessionById);

// Attendance marking and editing endpoints
router.post('/sessions/:id/records', authorizeRoles('admin', 'faculty'), validateMarkAttendance, markAttendance);
router.put('/records/:recordId', authorizeRoles('admin', 'faculty'), validateUpdateRecord, updateRecord);

// Student attendance summary endpoint
router.get('/student/:studentId', authorizeRoles('admin', 'faculty', 'student'), getStudentSummary);
router.get('/student-me', authorizeRoles('student'), (req, res, next) => {
  req.params.studentId = req.user.studentId;
  return getStudentSummary(req, res, next);
});

module.exports = router;
