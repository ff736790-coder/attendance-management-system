const { query } = require('../config/db');
const { calculateAttendanceMetrics, getSystemSetting } = require('../services/attendanceService');
const { toCsv } = require('../utils/csvExporter');

/**
 * Get subject-wise attendance analytics report
 */
async function getSubjectReport(req, res, next) {
  try {
    const { subjectId } = req.params;
    const lateWeightStr = await getSystemSetting('late_attendance_weight', '0.5');
    const lateWeight = parseFloat(lateWeightStr) || 0.5;
    const thresholdStr = await getSystemSetting('low_attendance_threshold', '75');
    const threshold = parseFloat(thresholdStr) || 75;

    // Subject & Course info
    const subRows = await query(
      `SELECT sub.*, c.name as course_name, c.code as course_code 
       FROM subjects sub 
       JOIN courses c ON sub.course_id = c.id 
       WHERE sub.id = ?`,
      [subjectId]
    );

    if (subRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const subject = subRows[0];

    // Total conducted sessions
    const sessionCountRows = await query(
      "SELECT COUNT(*) as count FROM attendance_sessions WHERE subject_id = ? AND status != 'cancelled'",
      [subjectId]
    );
    const totalSessions = sessionCountRows[0].count;

    // Student roster with their attendance breakdown for this subject
    const studentStats = await query(
      `SELECT 
         st.id as student_id,
         st.roll_number,
         u.first_name,
         u.last_name,
         u.email,
         COUNT(ar.id) as sessions_recorded,
         SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present_count,
         SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late_count,
         SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent_count
       FROM class_enrollments ce
       JOIN students st ON ce.student_id = st.id
       JOIN users u ON st.user_id = u.id
       LEFT JOIN attendance_sessions ses ON ses.subject_id = ? AND ses.status != 'cancelled'
       LEFT JOIN attendance_records ar ON ar.session_id = ses.id AND ar.student_id = st.id
       WHERE ce.course_id = ? AND ce.status = 'enrolled'
       GROUP BY st.id, st.roll_number, u.first_name, u.last_name, u.email
       ORDER BY st.roll_number ASC`,
      [subjectId, subject.course_id]
    );

    let sumPercentages = 0;
    const students = studentStats.map(row => {
      const p = parseInt(row.present_count || 0, 10);
      const l = parseInt(row.late_count || 0, 10);
      const a = parseInt(row.absent_count || 0, 10);
      const metrics = calculateAttendanceMetrics(p, l, a, lateWeight);
      sumPercentages += metrics.percentage;

      return {
        studentId: row.student_id,
        rollNumber: row.roll_number,
        studentName: `${row.first_name} ${row.last_name}`,
        email: row.email,
        ...metrics,
        isBelowThreshold: metrics.eligible > 0 && metrics.percentage < threshold
      };
    });

    const averagePercentage = students.length > 0 ? Number((sumPercentages / students.length).toFixed(2)) : 0;

    res.json({
      success: true,
      subject: {
        id: subject.id,
        code: subject.code,
        name: subject.name,
        courseName: subject.course_name,
        courseCode: subject.course_code,
        totalSessions,
        threshold,
        lateWeight
      },
      averagePercentage,
      students
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get overarching Class / Course Attendance Report
 */
async function getClassReport(req, res, next) {
  try {
    const { courseId } = req.params;
    const lateWeightStr = await getSystemSetting('late_attendance_weight', '0.5');
    const lateWeight = parseFloat(lateWeightStr) || 0.5;
    const thresholdStr = await getSystemSetting('low_attendance_threshold', '75');
    const threshold = parseFloat(thresholdStr) || 75;

    const courseRows = await query('SELECT * FROM courses WHERE id = ?', [courseId]);
    if (courseRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const course = courseRows[0];

    const studentRows = await query(
      `SELECT 
         st.id as student_id,
         st.roll_number,
         u.first_name,
         u.last_name,
         u.email,
         SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present_count,
         SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late_count,
         SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent_count
       FROM class_enrollments ce
       JOIN students st ON ce.student_id = st.id
       JOIN users u ON st.user_id = u.id
       LEFT JOIN attendance_records ar ON ar.student_id = st.id
       LEFT JOIN attendance_sessions ses ON ar.session_id = ses.id AND ses.status != 'cancelled'
       WHERE ce.course_id = ? AND ce.status = 'enrolled'
       GROUP BY st.id, st.roll_number, u.first_name, u.last_name, u.email
       ORDER BY st.roll_number ASC`,
      [courseId]
    );

    let sumPct = 0;
    const roster = studentRows.map(row => {
      const p = parseInt(row.present_count || 0, 10);
      const l = parseInt(row.late_count || 0, 10);
      const a = parseInt(row.absent_count || 0, 10);
      const metrics = calculateAttendanceMetrics(p, l, a, lateWeight);
      sumPct += metrics.percentage;

      return {
        studentId: row.student_id,
        rollNumber: row.roll_number,
        name: `${row.first_name} ${row.last_name}`,
        email: row.email,
        ...metrics,
        isBelowThreshold: metrics.eligible > 0 && metrics.percentage < threshold
      };
    });

    const averagePercentage = roster.length > 0 ? Number((sumPct / roster.length).toFixed(2)) : 0;

    res.json({
      success: true,
      course,
      averagePercentage,
      students: roster
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Export Subject or Class Attendance to CSV
 */
async function exportCsv(req, res, next) {
  try {
    const { type, id } = req.query; // type: 'subject' or 'class'

    if (!type || !id) {
      return res.status(400).json({ success: false, message: 'Type (subject|class) and ID are required' });
    }

    const lateWeightStr = await getSystemSetting('late_attendance_weight', '0.5');
    const lateWeight = parseFloat(lateWeightStr) || 0.5;
    const thresholdStr = await getSystemSetting('low_attendance_threshold', '75');
    const threshold = parseFloat(thresholdStr) || 75;

    let title = 'attendance_report';
    let headers = ['Roll Number', 'Student Name', 'Email', 'Eligible Classes', 'Present', 'Late', 'Absent', 'Attendance %', 'Status'];
    let rows = [];

    if (type === 'subject') {
      const subRows = await query('SELECT code, name, course_id FROM subjects WHERE id = ?', [id]);
      if (subRows.length === 0) return res.status(404).json({ success: false, message: 'Subject not found' });
      const subject = subRows[0];
      title = `Attendance_${subject.code}_${new Date().toISOString().slice(0, 10)}`;

      const students = await query(
        `SELECT 
           st.roll_number,
           u.first_name,
           u.last_name,
           u.email,
           SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present_count,
           SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late_count,
           SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent_count
         FROM class_enrollments ce
         JOIN students st ON ce.student_id = st.id
         JOIN users u ON st.user_id = u.id
         LEFT JOIN attendance_sessions ses ON ses.subject_id = ? AND ses.status != 'cancelled'
         LEFT JOIN attendance_records ar ON ar.session_id = ses.id AND ar.student_id = st.id
         WHERE ce.course_id = ? AND ce.status = 'enrolled'
         GROUP BY st.id, st.roll_number, u.first_name, u.last_name, u.email
         ORDER BY st.roll_number ASC`,
        [id, subject.course_id]
      );

      rows = students.map(st => {
        const p = parseInt(st.present_count || 0, 10);
        const l = parseInt(st.late_count || 0, 10);
        const a = parseInt(st.absent_count || 0, 10);
        const m = calculateAttendanceMetrics(p, l, a, lateWeight);
        const status = m.percentage < threshold ? 'BELOW THRESHOLD (WARNING)' : 'NORMAL';

        return [
          st.roll_number,
          `${st.first_name} ${st.last_name}`,
          st.email,
          m.eligible,
          m.present,
          m.late,
          m.absent,
          `${m.percentage}%`,
          status
        ];
      });
    }

    const csvOutput = toCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${title}.csv"`);
    res.send(csvOutput);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSubjectReport,
  getClassReport,
  exportCsv
};
