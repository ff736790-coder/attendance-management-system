const { verifyToken } = require('../config/jwt');
const { query } = require('../config/db');

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required'
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format. Expected Bearer <token>'
      });
    }

    const token = parts[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: err.name === 'TokenExpiredError' ? 'Token expired. Please log in again.' : 'Invalid token signature'
      });
    }

    // Attach basic claims from token immediately
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      firstName: decoded.firstName,
      lastName: decoded.lastName
    };

    // If student, attach student_id; if faculty, attach faculty_id
    if (decoded.role === 'student' && decoded.studentId) {
      req.user.studentId = decoded.studentId;
    } else if (decoded.role === 'faculty' && decoded.facultyId) {
      req.user.facultyId = decoded.facultyId;
    }

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: err.message
    });
  }
}

module.exports = {
  authenticateToken
};
