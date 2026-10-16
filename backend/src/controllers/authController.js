const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { signToken } = require('../config/jwt');
const { logAudit } = require('../services/auditService');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password'
      });
    }

    const user = users[0];

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please contact the system administrator.`
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password'
      });
    }

    // Role specific lookup
    let roleMeta = {};
    if (user.role === 'student') {
      const studentRows = await query(
        `SELECT s.id as student_id, s.roll_number, s.course_id, s.semester, s.section, c.name as course_name
         FROM students s
         JOIN courses c ON s.course_id = c.id
         WHERE s.user_id = ?`,
        [user.id]
      );
      if (studentRows.length > 0) {
        roleMeta.studentId = studentRows[0].student_id;
        roleMeta.rollNumber = studentRows[0].roll_number;
        roleMeta.courseName = studentRows[0].course_name;
        roleMeta.semester = studentRows[0].semester;
        roleMeta.section = studentRows[0].section;
      }
    } else if (user.role === 'faculty') {
      const facRows = await query(
        'SELECT id as faculty_id, employee_id, department, designation FROM faculty WHERE user_id = ?',
        [user.id]
      );
      if (facRows.length > 0) {
        roleMeta.facultyId = facRows[0].faculty_id;
        roleMeta.employeeId = facRows[0].employee_id;
        roleMeta.department = facRows[0].department;
        roleMeta.designation = facRows[0].designation;
      }
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      ...roleMeta
    };

    const token = signToken(tokenPayload);

    await logAudit({
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'users',
      entityId: user.id,
      details: { role: user.role },
      req
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        ...roleMeta
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    const users = await query(
      'SELECT id, email, role, first_name, last_name, phone, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];
    let extra = {};

    if (user.role === 'student') {
      const st = await query(
        `SELECT s.id as student_id, s.roll_number, s.course_id, s.semester, s.section, c.name as course_name, c.code as course_code
         FROM students s
         JOIN courses c ON s.course_id = c.id
         WHERE s.user_id = ?`,
        [user.id]
      );
      if (st.length > 0) extra = { student: st[0] };
    } else if (user.role === 'faculty') {
      const fc = await query(
        'SELECT id as faculty_id, employee_id, department, designation FROM faculty WHERE user_id = ?',
        [user.id]
      );
      if (fc.length > 0) extra = { faculty: fc[0] };
    }

    res.json({
      success: true,
      user: {
        ...user,
        ...extra
      }
    });
  } catch (err) {
    next(err);
  }
}

async function updatePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password (min 6 chars) are required'
      });
    }

    const users = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_PASSWORD',
      entity: 'users',
      entityId: req.user.id,
      req
    });

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getProfile,
  updatePassword
};
