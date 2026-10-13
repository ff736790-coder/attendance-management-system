/**
 * In-Memory Database Fallback for Instant Local Demonstration
 * Automatically activated when external MySQL / Aiven Cloud is not yet connected
 */

const bcrypt = require('bcryptjs');

// Standard seed password hash for 'Password@123'
const SEED_PASSWORD_HASH = '$2a$10$fDeCBPaLgqO/XcEC.HMF7uMGmxPTZfLeIHAvZ2SJu56n2gVjFg9N2';

class MockDatabase {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = [
      { id: 1, email: 'admin@college.edu', password_hash: SEED_PASSWORD_HASH, role: 'admin', first_name: 'System', last_name: 'Administrator', phone: '+1-555-0100', status: 'active', created_at: '2026-01-10T08:00:00Z' },
      { id: 2, email: 'prof.sharma@college.edu', password_hash: SEED_PASSWORD_HASH, role: 'faculty', first_name: 'Rajesh', last_name: 'Sharma', phone: '+1-555-0101', status: 'active', created_at: '2026-01-10T08:00:00Z' },
      { id: 3, email: 'dr.aditi@college.edu', password_hash: SEED_PASSWORD_HASH, role: 'faculty', first_name: 'Aditi', last_name: 'Deshmukh', phone: '+1-555-0102', status: 'active', created_at: '2026-01-10T08:00:00Z' },
      { id: 4, email: 'rahul.verma@college.edu', password_hash: SEED_PASSWORD_HASH, role: 'student', first_name: 'Rahul', last_name: 'Verma', phone: '+1-555-0201', status: 'active', created_at: '2026-01-10T08:00:00Z' },
      { id: 5, email: 'priya.nair@college.edu', password_hash: SEED_PASSWORD_HASH, role: 'student', first_name: 'Priya', last_name: 'Nair', phone: '+1-555-0202', status: 'active', created_at: '2026-01-10T08:00:00Z' },
      { id: 6, email: 'amit.patel@college.edu', password_hash: SEED_PASSWORD_HASH, role: 'student', first_name: 'Amit', last_name: 'Patel', phone: '+1-555-0203', status: 'active', created_at: '2026-01-10T08:00:00Z' },
      { id: 7, email: 'sneha.reddy@college.edu', password_hash: SEED_PASSWORD_HASH, role: 'student', first_name: 'Sneha', last_name: 'Reddy', phone: '+1-555-0204', status: 'active', created_at: '2026-01-10T08:00:00Z' },
      { id: 8, email: 'vikram.singh@college.edu', password_hash: SEED_PASSWORD_HASH, role: 'student', first_name: 'Vikram', last_name: 'Singh', phone: '+1-555-0205', status: 'active', created_at: '2026-01-10T08:00:00Z' }
    ];

    this.courses = [
      { id: 1, code: 'CSE-2024', name: 'B.Tech Computer Science and Engineering', department: 'Computer Science', semester: 4, academic_year: '2024-2028', total_students: 5, total_subjects: 4 },
      { id: 2, code: 'IT-2024', name: 'B.Tech Information Technology', department: 'Information Technology', semester: 4, academic_year: '2024-2028', total_students: 0, total_subjects: 0 }
    ];

    this.subjects = [
      { id: 1, course_id: 1, code: 'CS401', name: 'Database Management Systems', credit_hours: 4, course_name: 'B.Tech Computer Science and Engineering', course_code: 'CSE-2024' },
      { id: 2, course_id: 1, code: 'CS402', name: 'Design & Analysis of Algorithms', credit_hours: 4, course_name: 'B.Tech Computer Science and Engineering', course_code: 'CSE-2024' },
      { id: 3, course_id: 1, code: 'CS403', name: 'Operating Systems', credit_hours: 3, course_name: 'B.Tech Computer Science and Engineering', course_code: 'CSE-2024' },
      { id: 4, course_id: 1, code: 'CS404', name: 'Artificial Intelligence & Machine Learning', credit_hours: 4, course_name: 'B.Tech Computer Science and Engineering', course_code: 'CSE-2024' }
    ];

    this.faculty = [
      { id: 1, user_id: 2, employee_id: 'EMP-CSE-101', department: 'Computer Science', designation: 'Professor & Head' },
      { id: 2, user_id: 3, employee_id: 'EMP-CSE-102', department: 'Computer Science', designation: 'Associate Professor' }
    ];

    this.students = [
      { id: 1, user_id: 4, roll_number: '2024CS001', course_id: 1, semester: 4, section: 'A' },
      { id: 2, user_id: 5, roll_number: '2024CS002', course_id: 1, semester: 4, section: 'A' },
      { id: 3, user_id: 6, roll_number: '2024CS003', course_id: 1, semester: 4, section: 'A' },
      { id: 4, user_id: 7, roll_number: '2024CS004', course_id: 1, semester: 4, section: 'A' },
      { id: 5, user_id: 8, roll_number: '2024CS005', course_id: 1, semester: 4, section: 'A' }
    ];

    this.faculty_assignments = [
      { id: 1, faculty_id: 1, subject_id: 1, academic_term: '2026-Spring' },
      { id: 2, faculty_id: 1, subject_id: 4, academic_term: '2026-Spring' },
      { id: 3, faculty_id: 2, subject_id: 2, academic_term: '2026-Spring' },
      { id: 4, faculty_id: 2, subject_id: 3, academic_term: '2026-Spring' }
    ];

    this.enrollments = [
      { id: 1, student_id: 1, course_id: 1, status: 'enrolled' },
      { id: 2, student_id: 2, course_id: 1, status: 'enrolled' },
      { id: 3, student_id: 3, course_id: 1, status: 'enrolled' },
      { id: 4, student_id: 4, course_id: 1, status: 'enrolled' },
      { id: 5, student_id: 5, course_id: 1, status: 'enrolled' }
    ];

    this.sessions = [
      { id: 1, subject_id: 1, faculty_id: 1, session_date: '2026-03-02', start_time: '09:00:00', end_time: '10:00:00', topic: 'Relational Algebra & Normalization', status: 'completed', remarks: 'Regular lecture' },
      { id: 2, subject_id: 1, faculty_id: 1, session_date: '2026-03-04', start_time: '09:00:00', end_time: '10:00:00', topic: 'SQL DDL and DML Queries', status: 'completed', remarks: 'Lab tutorial included' },
      { id: 3, subject_id: 1, faculty_id: 1, session_date: '2026-03-09', start_time: '09:00:00', end_time: '10:00:00', topic: 'Transaction Processing & ACID Properties', status: 'completed', remarks: 'Regular lecture' },
      { id: 4, subject_id: 1, faculty_id: 1, session_date: '2026-03-11', start_time: '09:00:00', end_time: '10:00:00', topic: 'Concurrency Control & 2PL Lock Manager', status: 'completed', remarks: 'Regular lecture' },
      { id: 5, subject_id: 1, faculty_id: 1, session_date: '2026-03-16', start_time: '09:00:00', end_time: '10:00:00', topic: 'B+ Tree Indexing & Query Optimization', status: 'completed', remarks: 'Deep dive session' },
      { id: 6, subject_id: 1, faculty_id: 1, session_date: '2026-03-18', start_time: '09:00:00', end_time: '10:00:00', topic: 'NoSQL and Distributed Databases', status: 'completed', remarks: 'Interactive discussion' }
    ];

    this.records = [];
    let recId = 1;
    // Session 1: 1-P, 2-P, 3-A, 4-P, 5-P
    [
      { s: 1, st: 1, stat: 'present' }, { s: 1, st: 2, stat: 'present' }, { s: 1, st: 3, stat: 'absent' }, { s: 1, st: 4, stat: 'present' }, { s: 1, st: 5, stat: 'present' },
      { s: 2, st: 1, stat: 'present' }, { s: 2, st: 2, stat: 'present' }, { s: 2, st: 3, stat: 'absent' }, { s: 2, st: 4, stat: 'late' }, { s: 2, st: 5, stat: 'present' },
      { s: 3, st: 1, stat: 'present' }, { s: 3, st: 2, stat: 'present' }, { s: 3, st: 3, stat: 'absent' }, { s: 3, st: 4, stat: 'absent' }, { s: 3, st: 5, stat: 'present' },
      { s: 4, st: 1, stat: 'present' }, { s: 4, st: 2, stat: 'present' }, { s: 4, st: 3, stat: 'present' }, { s: 4, st: 4, stat: 'present' }, { s: 4, st: 5, stat: 'late' },
      { s: 5, st: 1, stat: 'present' }, { s: 5, st: 2, stat: 'present' }, { s: 5, st: 3, stat: 'absent' }, { s: 5, st: 4, stat: 'absent' }, { s: 5, st: 5, stat: 'present' },
      { s: 6, st: 1, stat: 'present' }, { s: 6, st: 2, stat: 'present' }, { s: 6, st: 3, stat: 'late' }, { s: 6, st: 4, stat: 'present' }, { s: 6, st: 5, stat: 'present' }
    ].forEach(item => {
      this.records.push({
        id: recId++,
        session_id: item.s,
        student_id: item.st,
        status: item.stat,
        remarks: null,
        marked_by_user_id: 2,
        created_at: '2026-03-02T10:00:00Z',
        updated_at: '2026-03-02T10:00:00Z'
      });
    });

    this.settings = {
      low_attendance_threshold: '75',
      late_attendance_weight: '0.5',
      institution_name: 'Metropolitan Institute of Technology',
      academic_term_current: '2026-Spring'
    };

    this.notifications = [
      { id: 1, user_id: 6, type: 'low_attendance', title: '⚠️ Low Attendance Warning: CS401', message: 'Your attendance in Database Management Systems is currently 50%, below the mandatory 75% threshold.', is_read: false, created_at: '2026-03-18T10:30:00Z' },
      { id: 2, user_id: 4, type: 'system', title: 'Academic Semester Active', message: 'Welcome to the 2026 Spring semester. Keep your attendance above 75%.', is_read: true, created_at: '2026-03-01T08:00:00Z' }
    ];

    this.audit_logs = [
      { id: 1, user_id: 1, action: 'SYSTEM_BOOT', entity: 'system', entity_id: null, details: '{"event": "In-Memory Simulation Store Initialized"}', ip_address: '127.0.0.1', user_agent: 'Local System', created_at: '2026-01-10T08:00:00Z' }
    ];
  }

  async execute(sql, params = []) {
    const s = sql.trim();

    // 1. SELECT * FROM users WHERE email = ?
    if (/SELECT \* FROM users WHERE email = \?/i.test(s)) {
      const email = params[0];
      const found = this.users.filter(u => u.email.toLowerCase() === (email || '').toLowerCase());
      return found;
    }

    // 2. SELECT id, email, role, first_name, last_name, phone, status, created_at FROM users WHERE id = ?
    if (/SELECT .* FROM users WHERE id = \?/i.test(s)) {
      const id = params[0];
      const found = this.users.filter(u => u.id === parseInt(id, 10));
      return found;
    }

    // 3. SELECT * FROM users
    if (/SELECT .* FROM users/i.test(s)) {
      let res = [...this.users];
      if (params.length > 0 && typeof params[0] === 'string' && ['admin', 'faculty', 'student'].includes(params[0])) {
        res = res.filter(u => u.role === params[0]);
      }
      return res;
    }

    // 4. Students lookup
    if (/SELECT .* FROM students s.*WHERE s.user_id = \?/i.test(s)) {
      const userId = params[0];
      const st = this.students.find(x => x.user_id === parseInt(userId, 10));
      if (!st) return [];
      const course = this.courses.find(c => c.id === st.course_id);
      return [{
        student_id: st.id,
        roll_number: st.roll_number,
        course_id: st.course_id,
        semester: st.semester,
        section: st.section,
        course_name: course ? course.name : 'Computer Science',
        course_code: course ? course.code : 'CSE-2024'
      }];
    }

    if (/SELECT .* FROM students s.*WHERE s.id = \?/i.test(s)) {
      const stId = params[0];
      const st = this.students.find(x => x.id === parseInt(stId, 10));
      if (!st) return [];
      const user = this.users.find(u => u.id === st.user_id);
      const course = this.courses.find(c => c.id === st.course_id);
      return [{
        id: st.id,
        user_id: st.user_id,
        roll_number: st.roll_number,
        course_id: st.course_id,
        semester: st.semester,
        section: st.section,
        first_name: user?.first_name || 'Student',
        last_name: user?.last_name || '',
        email: user?.email || '',
        course_name: course?.name || 'Computer Science',
        course_code: course?.code || 'CSE-2024'
      }];
    }

    // 5. Faculty lookup
    if (/SELECT .* FROM faculty WHERE user_id = \?/i.test(s)) {
      const userId = params[0];
      const f = this.faculty.find(x => x.user_id === parseInt(userId, 10));
      if (!f) return [];
      return [{
        faculty_id: f.id,
        id: f.id,
        employee_id: f.employee_id,
        department: f.department,
        designation: f.designation
      }];
    }

    // 6. Settings lookup
    if (/SELECT setting_value FROM system_settings WHERE setting_key = \?/i.test(s)) {
      const key = params[0];
      const val = this.settings[key];
      return val ? [{ setting_value: val }] : [];
    }

    if (/SELECT .* FROM system_settings/i.test(s)) {
      return Object.keys(this.settings).map(k => ({
        setting_key: k,
        setting_value: this.settings[k],
        description: k
      }));
    }

    // 7. Courses and subjects
    if (/SELECT .* FROM courses/i.test(s)) {
      return this.courses;
    }

    if (/SELECT .* FROM subjects/i.test(s)) {
      return this.subjects;
    }

    // 8. Sessions
    if (/SELECT .* FROM attendance_sessions/i.test(s)) {
      if (/WHERE s\.id = \?/i.test(s)) {
        const id = parseInt(params[0], 10);
        const sess = this.sessions.find(x => x.id === id);
        if (!sess) return [];
        const sub = this.subjects.find(sb => sb.id === sess.subject_id);
        const fac = this.faculty.find(f => f.id === sess.faculty_id);
        const facUser = fac ? this.users.find(u => u.id === fac.user_id) : null;
        return [{
          ...sess,
          subject_name: sub?.name || '',
          subject_code: sub?.code || '',
          course_id: sub?.course_id || 1,
          course_name: sub?.course_name || '',
          faculty_first_name: facUser?.first_name || '',
          faculty_last_name: facUser?.last_name || ''
        }];
      }

      // List sessions with counts
      return this.sessions.map(sess => {
        const sub = this.subjects.find(sb => sb.id === sess.subject_id);
        const fac = this.faculty.find(f => f.id === sess.faculty_id);
        const facUser = fac ? this.users.find(u => u.id === fac.user_id) : null;
        const recs = this.records.filter(r => r.session_id === sess.id);
        const p = recs.filter(r => r.status === 'present').length;
        const l = recs.filter(r => r.status === 'late').length;
        const a = recs.filter(r => r.status === 'absent').length;

        return {
          id: sess.id,
          session_date: sess.session_date,
          start_time: sess.start_time,
          end_time: sess.end_time,
          topic: sess.topic,
          status: sess.status,
          remarks: sess.remarks,
          subject_id: sess.subject_id,
          subject_code: sub?.code || 'CS401',
          subject_name: sub?.name || 'DBMS',
          course_name: 'B.Tech CSE',
          course_code: 'CSE-2024',
          faculty_first_name: facUser?.first_name || 'Rajesh',
          faculty_last_name: facUser?.last_name || 'Sharma',
          faculty_id: sess.faculty_id,
          total_marked: recs.length,
          present_count: p,
          late_count: l,
          absent_count: a
        };
      });
    }

    // 9. Notifications
    if (/SELECT .* FROM notifications/i.test(s)) {
      const userId = params[0];
      return this.notifications.filter(n => n.user_id === parseInt(userId, 10));
    }

    // 10. Audit logs
    if (/SELECT .* FROM audit_logs/i.test(s)) {
      return this.audit_logs;
    }

    // 11. Class enrollments / roster
    if (/SELECT .* FROM class_enrollments/i.test(s)) {
      const sessId = params[0];
      return this.students.map(st => {
        const user = this.users.find(u => u.id === st.user_id);
        const rec = this.records.find(r => r.session_id === parseInt(sessId, 10) && r.student_id === st.id);
        return {
          student_id: st.id,
          roll_number: st.roll_number,
          semester: st.semester,
          section: st.section,
          first_name: user?.first_name || '',
          last_name: user?.last_name || '',
          email: user?.email || '',
          record_id: rec?.id || null,
          attendance_status: rec?.status || null,
          attendance_remarks: rec?.remarks || null
        };
      });
    }

    // 12. Student attendance records history
    if (/SELECT .* FROM attendance_records ar.*WHERE ar\.student_id = \?/i.test(s)) {
      const studentId = parseInt(params[0], 10);
      const studentRecs = this.records.filter(r => r.student_id === studentId);
      return studentRecs.map(r => {
        const sess = this.sessions.find(s => s.id === r.session_id);
        const sub = sess ? this.subjects.find(sb => sb.id === sess.subject_id) : null;
        return {
          record_id: r.id,
          status: r.status,
          remarks: r.remarks,
          created_at: r.created_at,
          session_date: sess?.session_date || '2026-03-02',
          start_time: sess?.start_time || '09:00:00',
          end_time: sess?.end_time || '10:00:00',
          topic: sess?.topic || '',
          subject_code: sub?.code || 'CS401',
          subject_name: sub?.name || 'DBMS',
          faculty_first_name: 'Rajesh',
          faculty_last_name: 'Sharma'
        };
      });
    }

    // 13. Subject stats for student
    if (/SELECT .* FROM subjects sub.*LEFT JOIN attendance_records/i.test(s)) {
      const studentId = parseInt(params[0], 10);
      return this.subjects.map(sub => {
        const sessForSub = this.sessions.filter(s => s.subject_id === sub.id && s.status !== 'cancelled');
        const recs = this.records.filter(r => r.student_id === studentId && sessForSub.some(s => s.id === r.session_id));
        const p = recs.filter(r => r.status === 'present').length;
        const l = recs.filter(r => r.status === 'late').length;
        const a = recs.filter(r => r.status === 'absent').length;

        return {
          subject_id: sub.id,
          subject_code: sub.code,
          subject_name: sub.name,
          credit_hours: sub.credit_hours,
          total_sessions: sessForSub.length,
          present_count: p,
          late_count: l,
          absent_count: a
        };
      });
    }

    // 14. INSERTS & UPDATES
    if (/INSERT INTO attendance_sessions/i.test(s)) {
      const newId = this.sessions.length + 1;
      this.sessions.push({
        id: newId,
        subject_id: params[0],
        faculty_id: params[1],
        session_date: params[2],
        start_time: params[3],
        end_time: params[4],
        topic: params[5],
        status: 'active',
        remarks: params[6]
      });
      return { insertId: newId, affectedRows: 1 };
    }

    if (/INSERT INTO attendance_records/i.test(s)) {
      const newId = this.records.length + 1;
      this.records.push({
        id: newId,
        session_id: params[0],
        student_id: params[1],
        status: params[2],
        remarks: params[3],
        marked_by_user_id: params[4],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      return { insertId: newId, affectedRows: 1 };
    }

    if (/UPDATE attendance_records SET status = \?/i.test(s)) {
      const [status, remarks, markedBy, id] = params;
      const rec = this.records.find(r => r.id === parseInt(id, 10));
      if (rec) {
        rec.status = status;
        rec.remarks = remarks;
        rec.marked_by_user_id = markedBy;
        rec.updated_at = new Date().toISOString();
      }
      return { affectedRows: 1 };
    }

    if (/INSERT INTO audit_logs/i.test(s)) {
      this.audit_logs.push({
        id: this.audit_logs.length + 1,
        user_id: params[0],
        action: params[1],
        entity: params[2],
        entity_id: params[3],
        details: params[4],
        ip_address: params[5],
        user_agent: params[6],
        created_at: new Date().toISOString()
      });
      return { insertId: this.audit_logs.length };
    }

    if (/UPDATE system_settings/i.test(s) || /INSERT INTO system_settings/i.test(s)) {
      this.settings[params[0]] = String(params[1]);
      return { affectedRows: 1 };
    }

    if (/UPDATE notifications SET is_read = TRUE/i.test(s)) {
      this.notifications.forEach(n => { n.is_read = true; });
      return { affectedRows: 1 };
    }

    // Default fallback return
    return [{ count: 0, total: 0 }];
  }
}

const mockDbInstance = new MockDatabase();

module.exports = {
  mockDb: mockDbInstance
};
