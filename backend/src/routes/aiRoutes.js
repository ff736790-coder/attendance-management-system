const express = require('express');
const router = express.Router();
const {
  summarizeClass,
  studentSuggestions,
  askAssistant,
  monthlySummary
} = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/rbacMiddleware');

router.use(authenticateToken);

// Faculty and Admin AI features
router.post('/summarize-class', authorizeRoles('admin', 'faculty'), summarizeClass);
router.post('/ask', authorizeRoles('admin', 'faculty'), askAssistant);
router.get('/monthly-summary', authorizeRoles('admin', 'faculty'), monthlySummary);

// Student suggestions: Students can view their own, Faculty/Admin can view any student
router.get('/student-suggestions/:studentId', authorizeRoles('admin', 'faculty', 'student'), studentSuggestions);
router.get('/my-suggestions', authorizeRoles('student'), (req, res, next) => {
  req.params.studentId = req.user.studentId;
  return studentSuggestions(req, res, next);
});

module.exports = router;
