/**
 * Faculty Dashboard & Attendance Marking Module
 */

let activeMarkingSessionId = null;

async function loadFacultyDashboard() {
  try {
    const user = api.getUser();

    // Load faculty's sessions and subjects
    const [sessionsRes, subjectsRes] = await Promise.all([
      api.getSessions({ limit: 20 }).catch(() => ({ data: [] })),
      api.getSubjects().catch(() => ({ data: [] }))
    ]);

    const sessions = sessionsRes.data || [];
    const subjects = subjectsRes.data || [];

    // Filter subjects taught by this faculty if role is faculty
    const mySubjects = subjects;

    // Update faculty stats
    const elTotSessions = document.getElementById('faculty-stat-sessions');
    const elTotSubjects = document.getElementById('faculty-stat-subjects');
    if (elTotSessions) elTotSessions.textContent = sessions.length;
    if (elTotSubjects) elTotSubjects.textContent = mySubjects.length;

    // Populate subject select dropdown in create session modal and report selector
    populateFacultySubjectSelects(mySubjects);

    // Render Sessions Table
    renderFacultySessionsTable(sessions);

    // Setup Create Session modal
    setupCreateSessionModal();
  } catch (err) {
    console.error('Failed to load faculty dashboard:', err);
    showToast('Failed to load sessions', 'error');
  }
}

function populateFacultySubjectSelects(subjects) {
  const sessionSubjectSelect = document.getElementById('create-session-subject');
  const reportSubjectSelect = document.getElementById('faculty-report-subject-select');

  const optionsHtml = subjects.map(s => `
    <option value="${s.id}">${s.code} - ${s.name} (${s.course_name || 'CSE'})</option>
  `).join('');

  if (sessionSubjectSelect) {
    sessionSubjectSelect.innerHTML = `<option value="">-- Choose Subject --</option>${optionsHtml}`;
  }
  if (reportSubjectSelect) {
    reportSubjectSelect.innerHTML = `<option value="">-- Select Subject for Report --</option>${optionsHtml}`;
  }
}

function renderFacultySessionsTable(sessions) {
  const container = document.getElementById('faculty-sessions-table-body');
  if (!container) return;

  if (sessions.length === 0) {
    container.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-400">No attendance sessions recorded yet. Click "+ New Session" to create one.</td></tr>';
    return;
  }

  container.innerHTML = sessions.map(s => {
    const statusBadge = s.status === 'completed'
      ? '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Completed</span>'
      : '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending Marks</span>';

    return `
      <tr class="border-b border-slate-800 hover:bg-slate-800/40 transition">
        <td class="py-3 px-4 text-sm font-mono text-indigo-300 font-semibold">${s.session_date}</td>
        <td class="py-3 px-4 text-sm">
          <div class="font-bold text-white">${s.subject_code}</div>
          <div class="text-xs text-slate-400">${s.subject_name}</div>
        </td>
        <td class="py-3 px-4 text-sm text-slate-300">${s.topic || 'Regular Lecture'}</td>
        <td class="py-3 px-4 text-sm text-xs font-mono text-slate-400">${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}</td>
        <td class="py-3 px-4 text-sm">
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-emerald-400 font-bold">${s.present_count || 0}P</span>
            <span class="text-slate-600">/</span>
            <span class="text-amber-400 font-bold">${s.late_count || 0}L</span>
            <span class="text-slate-600">/</span>
            <span class="text-rose-400 font-bold">${s.absent_count || 0}A</span>
          </div>
        </td>
        <td class="py-3 px-4 text-sm text-right">
          <button onclick="openMarkAttendanceSheet(${s.id})" class="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-semibold transition">
            Mark / Edit
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Open Attendance Marking Sheet
async function openMarkAttendanceSheet(sessionId) {
  activeMarkingSessionId = sessionId;
  const modal = document.getElementById('modal-mark-attendance');
  const titleEl = document.getElementById('mark-sheet-title');
  const tableBody = document.getElementById('mark-sheet-table-body');

  if (!modal || !tableBody) return;
  modal.classList.remove('hidden');

  tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-400">Loading student roster...</td></tr>';

  try {
    const res = await api.getSessionById(sessionId);
    const session = res.session;
    const students = res.students;

    if (titleEl) {
      titleEl.textContent = `Attendance: ${session.subject_code} - ${session.subject_name} (${session.session_date})`;
    }

    if (students.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-slate-400">No students enrolled in this course.</td></tr>';
      return;
    }

    tableBody.innerHTML = students.map(st => {
      const currentStatus = st.attendance_status || 'present'; // default to present

      return `
        <tr class="border-b border-slate-800 hover:bg-slate-850" data-student-id="${st.student_id}">
          <td class="py-3 px-4 font-mono text-xs font-semibold text-slate-300">${st.roll_number}</td>
          <td class="py-3 px-4 text-sm font-medium text-white">${st.first_name} ${st.last_name}</td>
          <td class="py-3 px-4">
            <div class="inline-flex rounded-xl p-1 bg-slate-900 border border-slate-700/60">
              <label class="cursor-pointer px-3 py-1 rounded-lg text-xs font-semibold transition has-[:checked]:bg-emerald-500 has-[:checked]:text-white text-slate-400 hover:text-white">
                <input type="radio" name="status-${st.student_id}" value="present" class="hidden" ${currentStatus === 'present' ? 'checked' : ''}>
                Present
              </label>
              <label class="cursor-pointer px-3 py-1 rounded-lg text-xs font-semibold transition has-[:checked]:bg-amber-500 has-[:checked]:text-white text-slate-400 hover:text-white">
                <input type="radio" name="status-${st.student_id}" value="late" class="hidden" ${currentStatus === 'late' ? 'checked' : ''}>
                Late
              </label>
              <label class="cursor-pointer px-3 py-1 rounded-lg text-xs font-semibold transition has-[:checked]:bg-rose-500 has-[:checked]:text-white text-slate-400 hover:text-white">
                <input type="radio" name="status-${st.student_id}" value="absent" class="hidden" ${currentStatus === 'absent' ? 'checked' : ''}>
                Absent
              </label>
            </div>
          </td>
          <td class="py-3 px-4">
            <input type="text" class="student-remark-input bg-slate-900/80 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full"
              placeholder="Optional notes" value="${st.attendance_remarks || ''}">
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-rose-400">Error: ${err.message}</td></tr>`;
  }
}

// Bulk mark helper functions
function markAllStudents(status) {
  const radios = document.querySelectorAll(`#mark-sheet-table-body input[type="radio"][value="${status}"]`);
  radios.forEach(r => { r.checked = true; });
  showToast(`Marked all students as "${status.toUpperCase()}"`, 'info');
}

async function submitMarkAttendanceSheet() {
  if (!activeMarkingSessionId) return;

  const rows = document.querySelectorAll('#mark-sheet-table-body tr[data-student-id]');
  const records = [];

  rows.forEach(row => {
    const studentId = parseInt(row.dataset.studentId, 10);
    const checkedRadio = row.querySelector('input[type="radio"]:checked');
    const status = checkedRadio ? checkedRadio.value : 'present';
    const remarkInput = row.querySelector('.student-remark-input');
    const remarks = remarkInput ? remarkInput.value.trim() : '';

    records.push({ studentId, status, remarks });
  });

  const saveBtn = document.getElementById('btn-save-attendance-sheet');
  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="animate-spin mr-1">⟳</span> Saving...';
    }

    const res = await api.markAttendance(activeMarkingSessionId, records);
    showToast(`Attendance saved! Updated ${res.updated || 0}, Marked ${res.inserted || 0} students.`, 'success');

    // Close modal
    document.getElementById('modal-mark-attendance')?.classList.add('hidden');
    loadFacultyDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to save attendance', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Save Attendance';
    }
  }
}

function setupCreateSessionModal() {
  const btnOpen = document.getElementById('btn-open-create-session');
  const modal = document.getElementById('modal-create-session');
  const btnClose = document.getElementById('btn-close-create-session');
  const form = document.getElementById('form-create-session');

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => {
      // Set default date to today
      const dateInput = document.getElementById('create-session-date');
      if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
      modal.classList.remove('hidden');
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }

  if (form && !form.dataset.bound) {
    form.dataset.bound = 'true';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const payload = {
          subjectId: parseInt(document.getElementById('create-session-subject').value, 10),
          sessionDate: document.getElementById('create-session-date').value,
          startTime: document.getElementById('create-session-start').value,
          endTime: document.getElementById('create-session-end').value,
          topic: document.getElementById('create-session-topic').value.trim(),
          remarks: document.getElementById('create-session-remarks').value.trim()
        };

        const res = await api.createSession(payload);
        showToast('Session created! Opening attendance sheet...', 'success');
        modal.classList.add('hidden');
        form.reset();

        // Refresh dashboard and open attendance sheet directly for marking
        await loadFacultyDashboard();
        if (res.sessionId) {
          openMarkAttendanceSheet(res.sessionId);
        }
      } catch (err) {
        showToast(err.message || 'Failed to create session', 'error');
      }
    });
  }
}

// Load Faculty Subject Report view
async function loadFacultyReport(subjectId) {
  const container = document.getElementById('faculty-report-container');
  if (!container) return;

  if (!subjectId) {
    container.innerHTML = '<div class="text-center py-10 text-slate-400">Please choose a subject from the dropdown above to view the report.</div>';
    return;
  }

  container.innerHTML = '<div class="text-center py-10 text-slate-400">Generating subject analytics report...</div>';

  try {
    const res = await api.getSubjectReport(subjectId);
    const sub = res.subject;
    const students = res.students;

    const csvUrl = await api.exportCsvUrl('subject', subjectId);

    container.innerHTML = `
      <div class="glass-panel p-6 rounded-2xl border border-slate-700/60 mb-6">
        <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 class="text-xl font-bold text-white">${sub.code} - ${sub.name}</h3>
            <p class="text-xs text-slate-400">${sub.courseName} (${sub.courseCode}) • ${sub.totalSessions} Total Sessions</p>
          </div>
          <div class="flex items-center gap-3">
            <a href="${csvUrl}" target="_blank" download class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-600 text-xs font-semibold flex items-center gap-2 transition">
              <span>📥</span> Download CSV Report
            </a>
            <button onclick="requestAiClassSummary(${subjectId})" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition">
              <span>✨</span> AI Report Summary
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
          <div>
            <div class="text-xs text-slate-400">Class Average</div>
            <div class="text-2xl font-bold ${res.averagePercentage < sub.threshold ? 'text-rose-400' : 'text-emerald-400'}">${res.averagePercentage}%</div>
          </div>
          <div>
            <div class="text-xs text-slate-400">Total Enrolled</div>
            <div class="text-2xl font-bold text-white">${students.length}</div>
          </div>
          <div>
            <div class="text-xs text-slate-400">Below ${sub.threshold}% Threshold</div>
            <div class="text-2xl font-bold text-rose-400">${students.filter(s => s.isBelowThreshold).length}</div>
          </div>
          <div>
            <div class="text-xs text-slate-400">Late Attendance Weight</div>
            <div class="text-2xl font-bold text-amber-400">${sub.lateWeight}x</div>
          </div>
        </div>
      </div>

      <!-- Students Breakdown Table -->
      <div class="glass-panel rounded-2xl border border-slate-700/60 overflow-hidden">
        <div class="p-4 border-b border-slate-800 flex justify-between items-center">
          <h4 class="text-sm font-bold text-white uppercase tracking-wider">Student-by-Student Attendance Breakdown</h4>
          <span class="text-xs text-slate-400">Sorted by Roll Number</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-slate-800/60 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th class="py-3 px-4">Roll No</th>
                <th class="py-3 px-4">Student Name</th>
                <th class="py-3 px-4">Eligible</th>
                <th class="py-3 px-4">Present</th>
                <th class="py-3 px-4">Late</th>
                <th class="py-3 px-4">Absent</th>
                <th class="py-3 px-4">Percentage</th>
                <th class="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800 text-sm">
              ${students.map(s => `
                <tr class="hover:bg-slate-800/40 transition">
                  <td class="py-3 px-4 font-mono text-xs font-semibold text-indigo-300">${s.rollNumber}</td>
                  <td class="py-3 px-4 font-medium text-white">${s.studentName}</td>
                  <td class="py-3 px-4 text-slate-300">${s.eligible}</td>
                  <td class="py-3 px-4 text-emerald-400 font-bold">${s.present}</td>
                  <td class="py-3 px-4 text-amber-400 font-bold">${s.late}</td>
                  <td class="py-3 px-4 text-rose-400 font-bold">${s.absent}</td>
                  <td class="py-3 px-4 font-bold ${s.isBelowThreshold ? 'text-rose-400' : 'text-emerald-400'}">${s.percentage}%</td>
                  <td class="py-3 px-4">
                    ${s.isBelowThreshold
                      ? '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">⚠️ Defaulter (< 75%)</span>'
                      : '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Good Standing</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-rose-400 text-center">Error loading subject report: ${err.message}</div>`;
  }
}

window.loadFacultyDashboard = loadFacultyDashboard;
window.openMarkAttendanceSheet = openMarkAttendanceSheet;
window.markAllStudents = markAllStudents;
window.submitMarkAttendanceSheet = submitMarkAttendanceSheet;
window.loadFacultyReport = loadFacultyReport;
