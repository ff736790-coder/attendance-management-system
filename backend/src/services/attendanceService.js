const { query, getConnection } = require('../config/db');
const { logAudit } = require('./auditService');

/**
 * Fetch system setting with default fallback
 */
async function getSystemSetting(key, defaultValue) {
  try {
    const rows = await query('SELECT setting_value FROM system_settings WHERE setting_key = ?', [key]);
    if (rows && rows.length > 0) {
      return rows[0].setting_value;
    }
  } catch (err) {
    console.warn(`Could not read setting ${key}:`, err.message);
  }
  return defaultValue;
}

/**
 * Calculate attendance metrics from counts
 * Formula: attended / eligible * 100
 * Attended = present + (late * lateWeight)
 * Eligible = present + absent + late (or total uncancelled sessions)
 */
function calculateAttendanceMetrics(presentCount, lateCount, absentCount, lateWeight = 0.5) {
  const eligible = presentCount + lateCount + absentCount;
  const attended = presentCount + (lateCount * lateWeight);
  const percentage = eligible > 0 ? Number(((attended / eligible) * 100).toFixed(2)) : 0;
  return {
    eligible,
    attended: Number(attended.toFixed(1)),
    present: presentCount,
    late: lateCount,
    absent: absentCount,
    percentage
  };
}

/**
 * Create a new attendance session
 */
async function createSession({ subjectId, facultyId, sessionDate, startTime, endTime, topic, remarks, req = null }) {
  const result = await query(
    `INSERT INTO attendance_sessions (subject_id, faculty_id, session_date, start_time, end_time, topic, status, remarks)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
    [subjectId, facultyId, sessionDate, startTime, endTime, topic || null, remarks || null]
  );

  const sessionId = result.insertId;

  await logAudit({
    userId: req?.user?.id || null,
    action: 'CREATE_SESSION',
    entity: 'attendance_sessions',
    entityId: sessionId,
    details: { subjectId, facultyId, sessionDate, startTime, endTime, topic },
    req
  });

  return sessionId;
}

/**
 * Mark or bulk-submit attendance for a session.
 * Prevents duplicate attendance by checking existing records or utilizing DB unique constraint.
 * @param {Object} params
 * @param {number} params.sessionId
 * @param {number} params.markedByUserId
 * @param {Array<{studentId: number, status: 'present'|'absent'|'late', remarks?: string}>} params.records
 */
async function markAttendance({ sessionId, markedByUserId, records, req = null }) {
  if (!records || !Array.isArray(records) || records.length === 0) {
    throw new Error('Attendance records array is required');
  }

  // Validate session exists
  const sessionRows = await query(
    `SELECT s.*, sub.name as subject_name 
     FROM attendance_sessions s 
     JOIN subjects sub ON s.subject_id = sub.id 
     WHERE s.id = ?`,
    [sessionId]
  );

  if (sessionRows.length === 0) {
    const error = new Error('Attendance session not found');
    error.statusCode = 404;
    throw error;
  }

  const session = sessionRows[0];
  const validStatuses = ['present', 'absent', 'late'];

  // Insert or update records using parameterized queries
  let inserted = 0;
  let updated = 0;

  for (const record of records) {
    if (!validStatuses.includes(record.status)) {
      throw new Error(`Invalid attendance status "${record.status}" for student ID ${record.studentId}`);
    }

    // Check if record already exists for this session & student
    const existing = await query(
      'SELECT id, status FROM attendance_records WHERE session_id = ? AND student_id = ?',
      [sessionId, record.studentId]
    );

    if (existing.length > 0) {
      // Record exists: update with audit
      const oldStatus = existing[0].status;
      if (oldStatus !== record.status || record.remarks !== undefined) {
        await query(
          `UPDATE attendance_records 
           SET status = ?, remarks = ?, marked_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [record.status, record.remarks || null, markedByUserId, existing[0].id]
        );
        updated++;

        await logAudit({
          userId: markedByUserId,
          action: 'UPDATE_ATTENDANCE_RECORD',
          entity: 'attendance_records',
          entityId: existing[0].id,
          details: { sessionId, studentId: record.studentId, oldStatus, newStatus: record.status },
          req
        });
      }
    } else {
      // New record insert
      const res = await query(
        `INSERT INTO attendance_records (session_id, student_id, status, remarks, marked_by_user_id)
         VALUES (?, ?, ?, ?, ?)`,
        [sessionId, record.studentId, record.status, record.remarks || null, markedByUserId]
      );
      inserted++;

      await logAudit({
        userId: markedByUserId,
        action: 'MARK_ATTENDANCE_RECORD',
        entity: 'attendance_records',
        entityId: res.insertId,
        details: { sessionId, studentId: record.studentId, status: record.status },
        req
      });
    }
  }

  // Update session status to completed
  await query("UPDATE attendance_sessions SET status = 'completed' WHERE id = ?", [sessionId]);

  // Check for any students falling below threshold and create notifications
  await checkAndTriggerLowAttendanceNotifications(session.subject_id);

  return {
    success: true,
    sessionId,
    inserted,
    updated,
    totalProcessed: records.length
  };
}

/**
 * Check students enrolled in subject/course and trigger low-attendance warnings if < threshold
 */
async function checkAndTriggerLowAttendanceNotifications(subjectId = null) {
  try {
    const thresholdStr = await getSystemSetting('low_attendance_threshold', '75');
    const threshold = parseFloat(thresholdStr) || 75;
    const lateWeightStr = await getSystemSetting('late_attendance_weight', '0.5');
    const lateWeight = parseFloat(lateWeightStr) || 0.5;

    // Get aggregated stats for each student across subjects
    let sql = `
      SELECT 
        s.id as student_id,
        s.user_id,
        u.first_name,
        u.last_name,
        sub.id as subject_id,
        sub.name as subject_name,
        sub.code as subject_code,
        SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent_count
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN attendance_records ar ON s.id = ar.student_id
      JOIN attendance_sessions ses ON ar.session_id = ses.id
      JOIN subjects sub ON ses.subject_id = sub.id
      WHERE ses.status != 'cancelled'
    `;
    const params = [];

    if (subjectId) {
      sql += ' AND sub.id = ?';
      params.push(subjectId);
    }

    sql += ' GROUP BY s.id, s.user_id, u.first_name, u.last_name, sub.id, sub.name, sub.code';

    const rows = await query(sql, params);

    for (const row of rows) {
      const metrics = calculateAttendanceMetrics(
        parseInt(row.present_count || 0, 10),
        parseInt(row.late_count || 0, 10),
        parseInt(row.absent_count || 0, 10),
        lateWeight
      );

      if (metrics.eligible >= 3 && metrics.percentage < threshold) {
        // Check if unread notification already exists to avoid spamming
        const existingNotif = await query(
          `SELECT id FROM notifications 
           WHERE user_id = ? AND type = 'low_attendance' AND is_read = FALSE 
             AND message LIKE ?`,
          [row.user_id, `%${row.subject_code}%`]
        );

        if (existingNotif.length === 0) {
          const title = `⚠️ Low Attendance Warning: ${row.subject_code}`;
          const message = `Your attendance in ${row.subject_name} (${row.subject_code}) is currently ${metrics.percentage}%, which is below the mandatory ${threshold}% threshold. Please attend upcoming lectures to maintain eligibility.`;
          await query(
            'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
            [row.user_id, 'low_attendance', title, message]
          );
        }
      }
    }
  } catch (err) {
    console.error('Error in checkAndTriggerLowAttendanceNotifications:', err.message);
  }
}

/**
 * Retrieve comprehensive attendance summary for a specific student
 */
async function getStudentAttendanceSummary(studentId) {
  const lateWeightStr = await getSystemSetting('late_attendance_weight', '0.5');
  const lateWeight = parseFloat(lateWeightStr) || 0.5;
  const thresholdStr = await getSystemSetting('low_attendance_threshold', '75');
  const threshold = parseFloat(thresholdStr) || 75;

  // Student details
  const studentRows = await query(
    `SELECT s.*, u.first_name, u.last_name, u.email, c.name as course_name, c.code as course_code
     FROM students s
     JOIN users u ON s.user_id = u.id
     JOIN courses c ON s.course_id = c.id
     WHERE s.id = ?`,
    [studentId]
  );

  if (studentRows.length === 0) {
    throw new Error('Student profile not found');
  }

  const student = studentRows[0];

  // Subject-wise stats
  const subjectStats = await query(
    `SELECT 
       sub.id as subject_id,
       sub.code as subject_code,
       sub.name as subject_name,
       sub.credit_hours,
       COUNT(DISTINCT ses.id) as total_sessions,
       SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present_count,
       SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late_count,
       SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent_count
     FROM subjects sub
     LEFT JOIN attendance_sessions ses ON sub.id = ses.subject_id AND ses.status != 'cancelled'
     LEFT JOIN attendance_records ar ON ses.id = ar.session_id AND ar.student_id = ?
     WHERE sub.course_id = ?
     GROUP BY sub.id, sub.code, sub.name, sub.credit_hours`,
    [studentId, student.course_id]
  );

  let overallPresent = 0;
  let overallLate = 0;
  let overallAbsent = 0;

  const subjectsWithMetrics = subjectStats.map(sub => {
    const p = parseInt(sub.present_count || 0, 10);
    const l = parseInt(sub.late_count || 0, 10);
    const a = parseInt(sub.absent_count || 0, 10);
    overallPresent += p;
    overallLate += l;
    overallAbsent += a;

    const metrics = calculateAttendanceMetrics(p, l, a, lateWeight);
    return {
      subjectId: sub.subject_id,
      code: sub.subject_code,
      name: sub.subject_name,
      creditHours: sub.credit_hours,
      ...metrics,
      isLowAttendance: metrics.eligible > 0 && metrics.percentage < threshold
    };
  });

  const overallMetrics = calculateAttendanceMetrics(overallPresent, overallLate, overallAbsent, lateWeight);

  // Recent attendance records history
  const recentHistory = await query(
    `SELECT 
       ar.id as record_id,
       ar.status,
       ar.remarks,
       ar.created_at,
       ses.session_date,
       ses.start_time,
       ses.end_time,
       ses.topic,
       sub.code as subject_code,
       sub.name as subject_name,
       u_fac.first_name as faculty_first_name,
       u_fac.last_name as faculty_last_name
     FROM attendance_records ar
     JOIN attendance_sessions ses ON ar.session_id = ses.id
     JOIN subjects sub ON ses.subject_id = sub.id
     JOIN faculty f ON ses.faculty_id = f.id
     JOIN users u_fac ON f.user_id = u_fac.id
     WHERE ar.student_id = ?
     ORDER BY ses.session_date DESC, ses.start_time DESC
     LIMIT 20`,
    [studentId]
  );

  return {
    student: {
      id: student.id,
      userId: student.user_id,
      name: `${student.first_name} ${student.last_name}`,
      rollNumber: student.roll_number,
      course: student.course_name,
      semester: student.semester,
      section: student.section
    },
    threshold,
    lateWeight,
    overall: {
      ...overallMetrics,
      isLowAttendance: overallMetrics.percentage < threshold
    },
    subjects: subjectsWithMetrics,
    recentHistory
  };
}

module.exports = {
  getSystemSetting,
  calculateAttendanceMetrics,
  createSession,
  markAttendance,
  checkAndTriggerLowAttendanceNotifications,
  getStudentAttendanceSummary
};
