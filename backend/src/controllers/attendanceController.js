const { query } = require('../config/db');
const {
  createSession: createSessionService,
  markAttendance: markAttendanceService,
  getStudentAttendanceSummary,
  getSystemSetting
} = require('../services/attendanceService');
const { logAudit } = require('../services/auditService');

async function createSession(req, res, next) {
  try {
    const { subjectId, sessionDate, startTime, endTime, topic, remarks } = req.body;

    let facultyId = req.body.facultyId;

    // If caller is faculty, enforce faculty's own ID
    if (req.user.role === 'faculty') {
      const facRows = await query('SELECT id FROM faculty WHERE user_id = ?', [req.user.id]);
      if (facRows.length === 0) {
        return res.status(403).json({ success: false, message: 'Faculty profile not linked to user' });
      }
      facultyId = facRows[0].id;

      // Optional verification: is faculty assigned to this subject?
      const assigned = await query(
        'SELECT id FROM faculty_subject_assignments WHERE faculty_id = ? AND subject_id = ?',
        [facultyId, subjectId]
      );
      if (assigned.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to instruct this subject'
        });
      }
    } else if (req.user.role === 'admin' && !facultyId) {
      // If admin didn't specify facultyId, find the first assigned faculty or fallback
      const facAssign = await query('SELECT faculty_id FROM faculty_subject_assignments WHERE subject_id = ? LIMIT 1', [subjectId]);
      if (facAssign.length > 0) {
        facultyId = facAssign[0].faculty_id;
      } else {
        const anyFac = await query('SELECT id FROM faculty LIMIT 1');
        if (anyFac.length === 0) {
          return res.status(400).json({ success: false, message: 'No faculty exists in system to assign session' });
        }
        facultyId = anyFac[0].id;
      }
    }

    const sessionId = await createSessionService({
      subjectId: parseInt(subjectId, 10),
      facultyId: parseInt(facultyId, 10),
      sessionDate,
      startTime,
      endTime,
      topic,
      remarks,
      req
    });

    res.status(201).json({
      success: true,
      message: 'Attendance session created successfully',
      sessionId
    });
  } catch (err) {
    next(err);
  }
}

async function getSessions(req, res, next) {
  try {
    const { subjectId, facultyId, startDate, endDate, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let sql = `
      SELECT 
        s.id,
        s.session_date,
        s.start_time,
        s.end_time,
        s.topic,
        s.status,
        s.remarks,
        sub.id as subject_id,
        sub.code as subject_code,
        sub.name as subject_name,
        c.name as course_name,
        c.code as course_code,
        u.first_name as faculty_first_name,
        u.last_name as faculty_last_name,
        f.id as faculty_id,
        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = s.id) as total_marked,
        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = s.id AND ar.status = 'present') as present_count,
        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = s.id AND ar.status = 'absent') as absent_count,
        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = s.id AND ar.status = 'late') as late_count
      FROM attendance_sessions s
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN courses c ON sub.course_id = c.id
      JOIN faculty f ON s.faculty_id = f.id
      JOIN users u ON f.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Role filtering: faculty can see their own sessions by default unless specified
    if (req.user.role === 'faculty') {
      sql += ' AND f.user_id = ?';
      params.push(req.user.id);
    } else if (facultyId) {
      sql += ' AND s.faculty_id = ?';
      params.push(facultyId);
    }

    if (subjectId) {
      sql += ' AND s.subject_id = ?';
      params.push(subjectId);
    }

    if (startDate) {
      sql += ' AND s.session_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND s.session_date <= ?';
      params.push(endDate);
    }

    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY s.session_date DESC, s.start_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const sessions = await query(sql, params);

    // Count total for pagination
    const countSql = 'SELECT COUNT(*) as total FROM attendance_sessions';
    const countRows = await query(countSql);
    const totalCount = countRows[0]?.total || sessions.length;

    res.json({
      success: true,
      data: sessions,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: totalCount
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getSessionById(req, res, next) {
  try {
    const sessionId = req.params.id;

    const sessionRows = await query(
      `SELECT 
         s.*,
         sub.name as subject_name,
         sub.code as subject_code,
         sub.course_id,
         c.name as course_name,
         u.first_name as faculty_first_name,
         u.last_name as faculty_last_name
       FROM attendance_sessions s
       JOIN subjects sub ON s.subject_id = sub.id
       JOIN courses c ON sub.course_id = c.id
       JOIN faculty f ON s.faculty_id = f.id
       JOIN users u ON f.user_id = u.id
       WHERE s.id = ?`,
      [sessionId]
    );

    if (sessionRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance session not found' });
    }

    const session = sessionRows[0];

    // Fetch enrolled students for this course along with attendance status if already marked
    const students = await query(
      `SELECT 
         st.id as student_id,
         st.roll_number,
         st.semester,
         st.section,
         u.first_name,
         u.last_name,
         u.email,
         ar.id as record_id,
         ar.status as attendance_status,
         ar.remarks as attendance_remarks,
         ar.updated_at as record_updated_at
       FROM class_enrollments ce
       JOIN students st ON ce.student_id = st.id
       JOIN users u ON st.user_id = u.id
       LEFT JOIN attendance_records ar ON ar.session_id = ? AND ar.student_id = st.id
       WHERE ce.course_id = ? AND ce.status = 'enrolled'
       ORDER BY st.roll_number ASC`,
      [sessionId, session.course_id]
    );

    res.json({
      success: true,
      session,
      students
    });
  } catch (err) {
    next(err);
  }
}

async function markAttendance(req, res, next) {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const { records } = req.body;

    // Faculty authorization verification: can only mark their own assigned sessions (unless admin)
    if (req.user.role === 'faculty') {
      const sCheck = await query(
        `SELECT s.id 
         FROM attendance_sessions s 
         JOIN faculty f ON s.faculty_id = f.id 
         WHERE s.id = ? AND f.user_id = ?`,
        [sessionId, req.user.id]
      );
      if (sCheck.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: You can only record attendance for sessions you instruct.'
        });
      }
    }

    const result = await markAttendanceService({
      sessionId,
      markedByUserId: req.user.id,
      records,
      req
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function updateRecord(req, res, next) {
  try {
    const recordId = req.params.recordId;
    const { status, remarks } = req.body;

    const existingRows = await query('SELECT * FROM attendance_records WHERE id = ?', [recordId]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const record = existingRows[0];

    // Faculty check
    if (req.user.role === 'faculty') {
      const sess = await query(
        `SELECT s.id FROM attendance_sessions s 
         JOIN faculty f ON s.faculty_id = f.id 
         WHERE s.id = ? AND f.user_id = ?`,
        [record.session_id, req.user.id]
      );
      if (sess.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: You can only modify records for sessions you instruct.'
        });
      }
    }

    await query(
      `UPDATE attendance_records 
       SET status = ?, remarks = ?, marked_by_user_id = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, remarks || null, req.user.id, recordId]
    );

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_SINGLE_ATTENDANCE_RECORD',
      entity: 'attendance_records',
      entityId: recordId,
      details: { oldStatus: record.status, newStatus: status, remarks },
      req
    });

    res.json({
      success: true,
      message: 'Attendance record updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function getStudentSummary(req, res, next) {
  try {
    let studentId = req.params.studentId;

    // Security: Student role can ONLY view their own records
    if (req.user.role === 'student') {
      const st = await query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (st.length === 0) {
        return res.status(404).json({ success: false, message: 'Student profile not found' });
      }
      studentId = st[0].id;
    }

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
    }

    const summary = await getStudentAttendanceSummary(parseInt(studentId, 10));
    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSession,
  getSessions,
  getSessionById,
  markAttendance,
  updateRecord,
  getStudentSummary
};
