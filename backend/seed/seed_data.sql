-- Seed Data for AI-Powered Attendance Management System
-- Default test password for all seed accounts: Password@123

SET FOREIGN_KEY_CHECKS = 0;

-- Clean existing seed data
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE notifications;
TRUNCATE TABLE attendance_records;
TRUNCATE TABLE attendance_sessions;
TRUNCATE TABLE faculty_subject_assignments;
TRUNCATE TABLE class_enrollments;
TRUNCATE TABLE students;
TRUNCATE TABLE faculty;
TRUNCATE TABLE subjects;
TRUNCATE TABLE courses;
TRUNCATE TABLE system_settings;
TRUNCATE TABLE users;

-- 1. Insert System Settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('low_attendance_threshold', '75', 'Minimum percentage required to avoid low attendance warning'),
('late_attendance_weight', '0.5', 'Weight factor for late attendance in calculations (0.0 to 1.0)'),
('institution_name', 'Metropolitan Institute of Technology', 'Institution display name'),
('academic_term_current', '2026-Spring', 'Current active academic semester term');

-- 2. Insert Users
-- Password hash for 'Password@123'
INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, status) VALUES
(1, 'admin@college.edu', '$2a$10$fDeCBPaLgqO/XcEC.HMF7uMGmxPTZfLeIHAvZ2SJu56n2gVjFg9N2', 'admin', 'System', 'Administrator', '+1-555-0100', 'active'),
(2, 'prof.sharma@college.edu', '$2a$10$fDeCBPaLgqO/XcEC.HMF7uMGmxPTZfLeIHAvZ2SJu56n2gVjFg9N2', 'faculty', 'Rajesh', 'Sharma', '+1-555-0101', 'active'),
(3, 'dr.aditi@college.edu', '$2a$10$fDeCBPaLgqO/XcEC.HMF7uMGmxPTZfLeIHAvZ2SJu56n2gVjFg9N2', 'faculty', 'Aditi', 'Deshmukh', '+1-555-0102', 'active'),
(4, 'rahul.verma@college.edu', '$2a$10$fDeCBPaLgqO/XcEC.HMF7uMGmxPTZfLeIHAvZ2SJu56n2gVjFg9N2', 'student', 'Rahul', 'Verma', '+1-555-0201', 'active'),
(5, 'priya.nair@college.edu', '$2a$10$fDeCBPaLgqO/XcEC.HMF7uMGmxPTZfLeIHAvZ2SJu56n2gVjFg9N2', 'student', 'Priya', 'Nair', '+1-555-0202', 'active'),
(6, 'amit.patel@college.edu', '$2a$10$fDeCBPaLgqO/XcEC.HMF7uMGmxPTZfLeIHAvZ2SJu56n2gVjFg9N2', 'student', 'Amit', 'Patel', '+1-555-0203', 'active'),
(7, 'sneha.reddy@college.edu', '$2a$10$fDeCBPaLgqO/XcEC.HMF7uMGmxPTZfLeIHAvZ2SJu56n2gVjFg9N2', 'student', 'Sneha', 'Reddy', '+1-555-0204', 'active'),
(8, 'vikram.singh@college.edu', '$2a$10$fDeCBPaLgqO/XcEC.HMF7uMGmxPTZfLeIHAvZ2SJu56n2gVjFg9N2', 'student', 'Vikram', 'Singh', '+1-555-0205', 'active');

-- 3. Insert Courses
INSERT INTO courses (id, code, name, department, semester, academic_year) VALUES
(1, 'CSE-2024', 'B.Tech Computer Science and Engineering', 'Computer Science', 4, '2024-2028'),
(2, 'IT-2024', 'B.Tech Information Technology', 'Information Technology', 4, '2024-2028');

-- 4. Insert Subjects
INSERT INTO subjects (id, course_id, code, name, credit_hours) VALUES
(1, 1, 'CS401', 'Database Management Systems', 4),
(2, 1, 'CS402', 'Design & Analysis of Algorithms', 4),
(3, 1, 'CS403', 'Operating Systems', 3),
(4, 1, 'CS404', 'Artificial Intelligence & Machine Learning', 4);

-- 5. Insert Faculty Profiles
INSERT INTO faculty (id, user_id, employee_id, department, designation) VALUES
(1, 2, 'EMP-CSE-101', 'Computer Science', 'Professor & Head'),
(2, 3, 'EMP-CSE-102', 'Computer Science', 'Associate Professor');

-- 6. Insert Students Profiles
INSERT INTO students (id, user_id, roll_number, course_id, semester, section, guardian_email, guardian_phone) VALUES
(1, 4, '2024CS001', 1, 4, 'A', 'guardian.rahul@gmail.com', '+1-555-0901'),
(2, 5, '2024CS002', 1, 4, 'A', 'guardian.priya@gmail.com', '+1-555-0902'),
(3, 6, '2024CS003', 1, 4, 'A', 'guardian.amit@gmail.com', '+1-555-0903'),
(4, 7, '2024CS004', 1, 4, 'A', 'guardian.sneha@gmail.com', '+1-555-0904'),
(5, 8, '2024CS005', 1, 4, 'A', 'guardian.vikram@gmail.com', '+1-555-0905');

-- 7. Insert Faculty Subject Assignments
INSERT INTO faculty_subject_assignments (id, faculty_id, subject_id, academic_term) VALUES
(1, 1, 1, '2026-Spring'), -- Prof Sharma -> CS401 (DBMS)
(2, 1, 4, '2026-Spring'), -- Prof Sharma -> CS404 (AI & ML)
(3, 2, 2, '2026-Spring'), -- Dr Aditi -> CS402 (Algorithms)
(4, 2, 3, '2026-Spring'); -- Dr Aditi -> CS403 (OS)

-- 8. Insert Class Enrollments
INSERT INTO class_enrollments (student_id, course_id, academic_term, status) VALUES
(1, 1, '2026-Spring', 'enrolled'),
(2, 1, '2026-Spring', 'enrolled'),
(3, 1, '2026-Spring', 'enrolled'),
(4, 1, '2026-Spring', 'enrolled'),
(5, 1, '2026-Spring', 'enrolled');

-- 9. Insert Attendance Sessions
-- Sessions for CS401 (DBMS)
INSERT INTO attendance_sessions (id, subject_id, faculty_id, session_date, start_time, end_time, topic, status, remarks) VALUES
(1, 1, 1, '2026-03-02', '09:00:00', '10:00:00', 'Relational Algebra & Normalization', 'completed', 'Regular lecture'),
(2, 1, 1, '2026-03-04', '09:00:00', '10:00:00', 'SQL DDL and DML Queries', 'completed', 'Lab tutorial included'),
(3, 1, 1, '2026-03-09', '09:00:00', '10:00:00', 'Transaction Processing & ACID Properties', 'completed', 'Regular lecture'),
(4, 1, 1, '2026-03-11', '09:00:00', '10:00:00', 'Concurrency Control & 2PL Lock Manager', 'completed', 'Regular lecture'),
(5, 1, 1, '2026-03-16', '09:00:00', '10:00:00', 'B+ Tree Indexing & Query Optimization', 'completed', 'Deep dive session'),
(6, 1, 1, '2026-03-18', '09:00:00', '10:00:00', 'NoSQL and Distributed Databases', 'completed', 'Interactive discussion');

-- Sessions for CS402 (Algorithms)
INSERT INTO attendance_sessions (id, subject_id, faculty_id, session_date, start_time, end_time, topic, status, remarks) VALUES
(7, 2, 2, '2026-03-03', '10:15:00', '11:15:00', 'Divide and Conquer: QuickSort Analysis', 'completed', 'Regular lecture'),
(8, 2, 2, '2026-03-05', '10:15:00', '11:15:00', 'Dynamic Programming: 0/1 Knapsack', 'completed', 'Problem solving session'),
(9, 2, 2, '2026-03-10', '10:15:00', '11:15:00', 'Greedy Algorithms: Huffman Coding', 'completed', 'Regular lecture'),
(10, 2, 2, '2026-03-12', '10:15:00', '11:15:00', 'Graph Algorithms: Dijkstra and Bellman-Ford', 'completed', 'Regular lecture'),
(11, 2, 2, '2026-03-17', '10:15:00', '11:15:00', 'NP-Completeness and Reductions', 'completed', 'Theory class');

-- Sessions for CS404 (AI & ML)
INSERT INTO attendance_sessions (id, subject_id, faculty_id, session_date, start_time, end_time, topic, status, remarks) VALUES
(12, 4, 1, '2026-03-06', '11:30:00', '12:30:00', 'Search Algorithms: A* and Minimax', 'completed', 'Regular lecture'),
(13, 4, 1, '2026-03-13', '11:30:00', '12:30:00', 'Linear and Logistic Regression Models', 'completed', 'Hands-on lab'),
(14, 4, 1, '2026-03-20', '11:30:00', '12:30:00', 'Deep Neural Networks & Backpropagation', 'completed', 'Regular lecture');

-- 10. Insert Attendance Records
-- Rahul (1): High attendance
-- Priya (2): High attendance
-- Amit (3): Consistently LOW attendance (e.g. absent frequently)
-- Sneha (4): Borderline (around 70%)
-- Vikram (5): Normal (around 80%)

-- Session 1 (CS401)
INSERT INTO attendance_records (session_id, student_id, status, marked_by_user_id) VALUES
(1, 1, 'present', 2),
(1, 2, 'present', 2),
(1, 3, 'absent',  2),
(1, 4, 'present', 2),
(1, 5, 'present', 2);

-- Session 2 (CS401)
INSERT INTO attendance_records (session_id, student_id, status, marked_by_user_id) VALUES
(2, 1, 'present', 2),
(2, 2, 'present', 2),
(2, 3, 'absent',  2),
(2, 4, 'late',    2),
(2, 5, 'present', 2);

-- Session 3 (CS401)
INSERT INTO attendance_records (session_id, student_id, status, marked_by_user_id) VALUES
(3, 1, 'present', 2),
(3, 2, 'present', 2),
(3, 3, 'absent',  2),
(3, 4, 'absent',  2),
(3, 5, 'present', 2);

-- Session 4 (CS401)
INSERT INTO attendance_records (session_id, student_id, status, marked_by_user_id) VALUES
(4, 1, 'present', 2),
(4, 2, 'present', 2),
(4, 3, 'present', 2),
(4, 4, 'present', 2),
(4, 5, 'late',    2);

-- Session 5 (CS401)
INSERT INTO attendance_records (session_id, student_id, status, marked_by_user_id) VALUES
(5, 1, 'present', 2),
(5, 2, 'present', 2),
(5, 3, 'absent',  2),
(5, 4, 'absent',  2),
(5, 5, 'present', 2);

-- Session 6 (CS401)
INSERT INTO attendance_records (session_id, student_id, status, marked_by_user_id) VALUES
(6, 1, 'present', 2),
(6, 2, 'present', 2),
(6, 3, 'late',    2),
(6, 4, 'present', 2),
(6, 5, 'present', 2);

-- Session 7 (CS402)
INSERT INTO attendance_records (session_id, student_id, status, marked_by_user_id) VALUES
(7, 1, 'present', 3),
(7, 2, 'present', 3),
(7, 3, 'absent',  3),
(7, 4, 'present', 3),
(7, 5, 'present', 3);

-- Session 8 (CS402)
INSERT INTO attendance_records (session_id, student_id, status, marked_by_user_id) VALUES
(8, 1, 'present', 3),
(8, 2, 'late',    3),
(8, 3, 'absent',  3),
(8, 4, 'absent',  3),
(8, 5, 'present', 3);

-- Session 9 (CS402)
INSERT INTO attendance_records (session_id, student_id, status, marked_by_user_id) VALUES
(9, 1, 'present', 3),
(9, 2, 'present', 3),
(9, 3, 'absent',  3),
(9, 4, 'present', 3),
(9, 5, 'absent',  3);

-- Session 10 (CS402)
INSERT INTO attendance_records (session_id, student_id, status, marked_by_user_id) VALUES
(10, 1, 'late',    3),
(10, 2, 'present', 3),
(10, 3, 'present', 3),
(10, 4, 'present', 3),
(10, 5, 'present', 3);

-- Session 11 (CS402)
INSERT INTO attendance_records (session_id, student_id, status, marked_by_user_id) VALUES
(11, 1, 'present', 3),
(11, 2, 'present', 3),
(11, 3, 'absent',  3),
(11, 4, 'absent',  3),
(11, 5, 'present', 3);

-- Session 12 (CS404)
INSERT INTO attendance_records (session_id, student_id, status, marked_by_user_id) VALUES
(12, 1, 'present', 2),
(12, 2, 'present', 2),
(12, 3, 'absent',  2),
(12, 4, 'present', 2),
(12, 5, 'present', 2);

-- Session 13 (CS404)
INSERT INTO attendance_records (session_id, student_id, status, marked_by_user_id) VALUES
(13, 1, 'present', 2),
(13, 2, 'present', 2),
(13, 3, 'absent',  2),
(13, 4, 'late',    2),
(13, 5, 'present', 2);

-- Session 14 (CS404)
INSERT INTO attendance_records (session_id, student_id, status, marked_by_user_id) VALUES
(14, 1, 'present', 2),
(14, 2, 'present', 2),
(14, 3, 'present', 2),
(14, 4, 'present', 2),
(14, 5, 'present', 2);

-- 11. Insert Seed Notifications
INSERT INTO notifications (user_id, type, title, message, is_read) VALUES
(6, 'low_attendance', 'Urgent: Low Attendance Warning', 'Your overall attendance across CS401 and CS402 has fallen below 75%. Please contact your faculty advisor.', FALSE),
(7, 'low_attendance', 'Attendance Advisory Notice', 'Your current attendance is 71.4%, which is slightly below the mandatory 75% threshold.', FALSE),
(4, 'system', 'Academic Semester Active', 'Welcome to the 2026 Spring semester. Keep your attendance above 75% to stay eligible for exams.', TRUE);

-- 12. Insert Sample Audit Logs
INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES
(1, 'SEED_DATABASE', 'system', NULL, '{"event": "Initial database seed populated with academic test data"}'),
(2, 'CREATE_SESSION', 'attendance_sessions', 1, '{"topic": "Relational Algebra & Normalization", "subject": "CS401"}'),
(2, 'MARK_ATTENDANCE', 'attendance_sessions', 1, '{"total_students": 5, "present": 4, "absent": 1}');

SET FOREIGN_KEY_CHECKS = 1;
