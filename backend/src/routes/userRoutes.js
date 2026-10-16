const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  getStudents,
  getFaculty,
  getCourses,
  getSubjects,
  assignFacultySubject
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/rbacMiddleware');
const { validateCreateUser } = require('../validators/userValidators');

router.use(authenticateToken);

// Publicly readable by all authenticated users
router.get('/courses', getCourses);
router.get('/subjects', getSubjects);

// Faculty & Admin readable
router.get('/students', authorizeRoles('admin', 'faculty'), getStudents);

// Admin-only management routes
router.get('/users', authorizeRoles('admin'), getUsers);
router.post('/users', authorizeRoles('admin'), validateCreateUser, createUser);
router.get('/faculty', authorizeRoles('admin'), getFaculty);
router.post('/assign-faculty', authorizeRoles('admin'), assignFacultySubject);

module.exports = router;
