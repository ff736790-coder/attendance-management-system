const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { logAudit } = require('../services/auditService');

async function getUsers(req, res, next) {
  try {
    const { role, status, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let sql = 'SELECT id, email, role, first_name, last_name, phone, status, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const users = await query(sql, params);
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { email, password, role, firstName, lastName, phone, studentData, facultyData } = req.body;

    // Check email uniqueness
    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [email, passwordHash, role, firstName, lastName, phone || null]
    );

    const userId = userResult.insertId;

    if (role === 'student' && studentData) {
      const { rollNumber, courseId, semester = 1, section = 'A', guardianEmail, guardianPhone } = studentData;
      await query(
        `INSERT INTO students (user_id, roll_number, course_id, semester, section, guardian_email, guardian_phone)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, rollNumber, courseId, semester, section, guardianEmail || null, guardianPhone || null]
      );
    } else if (role === 'faculty' && facultyData) {
      const { employeeId, department, designation = 'Assistant Professor' } = facultyData;
      await query(
        `INSERT INTO faculty (user_id, employee_id, department, designation)
         VALUES (?, ?, ?, ?)`,
        [userId, employeeId, department, designation]
      );
    }

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_USER',
      entity: 'users',
      entityId: userId,
      details: { email, role },
      req
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      userId
    });
  } catch (err) {
    next(err);
  }
}

async function getStudents(req, res, next) {
  try {
    const { courseId, search } = req.query;

    let sql = `
      SELECT 
        s.id as student_id,
        s.user_id,
        s.roll_number,
        s.semester,
        s.section,
        s.guardian_email,
        s.guardian_phone,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.status,
        c.id as course_id,
        c.name as course_name,
        c.code as course_code
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN courses c ON s.course_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (courseId) {
      sql += ' AND s.course_id = ?';
      params.push(courseId);
    }
    if (search) {
      sql += ' AND (s.roll_number LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    sql += ' ORDER BY s.roll_number ASC';
    const students = await query(sql, params);
    res.json({ success: true, data: students });
  } catch (err) {
    next(err);
  }
}

async function getFaculty(req, res, next) {
  try {
    const facultyList = await query(
      `SELECT 
         f.id as faculty_id,
         f.user_id,
         f.employee_id,
         f.department,
         f.designation,
         u.email,
         u.first_name,
         u.last_name,
         u.phone,
         u.status,
         (
           SELECT JSON_ARRAYAGG(JSON_OBJECT('subjectId', sub.id, 'code', sub.code, 'name', sub.name))
           FROM faculty_subject_assignments fsa
           JOIN subjects sub ON fsa.subject_id = sub.id
           WHERE fsa.faculty_id = f.id
         ) as assigned_subjects
       FROM faculty f
       JOIN users u ON f.user_id = u.id
       ORDER BY f.employee_id ASC`
    );

    res.json({ success: true, data: facultyList });
  } catch (err) {
    next(err);
  }
}

async function getCourses(req, res, next) {
  try {
    const courses = await query(
      `SELECT c.*, 
         (SELECT COUNT(*) FROM students s WHERE s.course_id = c.id) as total_students,
         (SELECT COUNT(*) FROM subjects sub WHERE sub.course_id = c.id) as total_subjects
       FROM courses c
       ORDER BY c.name ASC`
    );
    res.json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
}

async function getSubjects(req, res, next) {
  try {
    const { courseId, facultyId } = req.query;

    let sql = `
      SELECT 
        sub.*,
        c.name as course_name,
        c.code as course_code,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('facultyId', f.id, 'name', CONCAT(u.first_name, ' ', u.last_name)))
          FROM faculty_subject_assignments fsa
          JOIN faculty f ON fsa.faculty_id = f.id
          JOIN users u ON f.user_id = u.id
          WHERE fsa.subject_id = sub.id
        ) as assigned_faculty
      FROM subjects sub
      JOIN courses c ON sub.course_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (courseId) {
      sql += ' AND sub.course_id = ?';
      params.push(courseId);
    }

    if (facultyId) {
      sql += ' AND sub.id IN (SELECT subject_id FROM faculty_subject_assignments WHERE faculty_id = ?)';
      params.push(facultyId);
    }

    sql += ' ORDER BY sub.code ASC';
    const subjects = await query(sql, params);
    res.json({ success: true, data: subjects });
  } catch (err) {
    next(err);
  }
}

async function assignFacultySubject(req, res, next) {
  try {
    const { facultyId, subjectId, academicTerm = '2026-Spring' } = req.body;

    if (!facultyId || !subjectId) {
      return res.status(400).json({ success: false, message: 'Faculty ID and Subject ID are required' });
    }

    await query(
      `INSERT INTO faculty_subject_assignments (faculty_id, subject_id, academic_term)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE academic_term = VALUES(academic_term)`,
      [facultyId, subjectId, academicTerm]
    );

    await logAudit({
      userId: req.user.id,
      action: 'ASSIGN_FACULTY_SUBJECT',
      entity: 'faculty_subject_assignments',
      details: { facultyId, subjectId, academicTerm },
      req
    });

    res.json({ success: true, message: 'Faculty assigned to subject successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUsers,
  createUser,
  getStudents,
  getFaculty,
  getCourses,
  getSubjects,
  assignFacultySubject
};
