const express = require('express');
const router = express.Router();
const { login, getProfile, updatePassword } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateLogin } = require('../validators/userValidators');

router.post('/login', authLimiter, validateLogin, login);
router.get('/profile', authenticateToken, getProfile);
router.post('/change-password', authenticateToken, updatePassword);

module.exports = router;
