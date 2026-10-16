/**
 * Admin Dashboard & System Management Module
 */

let adminStatsChart = null;

async function loadAdminDashboard() {
  try {
    // Load courses, students, faculty, settings, audit logs in parallel
    const [coursesRes, studentsRes, facultyRes, settingsRes] = await Promise.all([
      api.getCourses().catch(() => ({ data: [] })),
      api.getStudents().catch(() => ({ data: [] })),
      api.getFaculty().catch(() => ({ data: [] })),
      api.getSettings().catch(() => ({ data: {} }))
    ]);

    const courses = coursesRes.data || [];
    const students = studentsRes.data || [];
    const faculty = facultyRes.data || [];
    const settings = settingsRes.data || {};

    // Update KPI metric counters
    const elTotStudents = document.getElementById('admin-stat-students');
    const elTotFaculty = document.getElementById('admin-stat-faculty');
    const elTotCourses = document.getElementById('admin-stat-courses');
    const elThreshold = document.getElementById('admin-stat-threshold');

    if (elTotStudents) elTotStudents.textContent = students.length;
    if (elTotFaculty) elTotFaculty.textContent = faculty.length;
    if (elTotCourses) elTotCourses.textContent = courses.length;
    if (elThreshold) elThreshold.textContent = `${settings.low_attendance_threshold || 75}%`;

    // Render Admin Quick Users table
    renderAdminUsersTable();

    // Render Admin Courses & Subjects tab
    renderAdminCourses(courses);

    // Render Audit logs
    renderAdminAuditLogs();

    // Setup Admin System Settings inputs
    setupAdminSettings(settings);

    // Render analytics chart if Chart.js is available
    renderAdminChart(students.length, faculty.length, courses.length);
  } catch (err) {
    console.error('Failed to load admin dashboard:', err);
    showToast('Failed to load some admin data', 'error');
  }
}

async function renderAdminUsersTable(roleFilter = '') {
  const container = document.getElementById('admin-users-table-body');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-slate-400">Loading user roster...</td></tr>';

  try {
    const res = await api.getUsers({ role: roleFilter, limit: 30 });
    const users = res.data || [];

    if (users.length === 0) {
      container.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-slate-400">No users found for this filter.</td></tr>';
      return;
    }

    container.innerHTML = users.map(u => {
      const roleColor = {
        admin: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        faculty: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        student: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      }[u.role] || 'bg-slate-700 text-slate-300';

      const statusBadge = u.status === 'active'
        ? '<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300">Active</span>'
        : '<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-700 text-slate-400">Inactive</span>';

      return `
        <tr class="border-b border-slate-800 hover:bg-slate-800/40 transition">
          <td class="py-3 px-4 text-sm font-medium text-white">${u.first_name} ${u.last_name}</td>
          <td class="py-3 px-4 text-sm text-slate-300 font-mono">${u.email}</td>
          <td class="py-3 px-4 text-sm">
            <span class="px-2.5 py-1 text-xs font-semibold rounded-lg border ${roleColor} uppercase tracking-wider">${u.role}</span>
          </td>
          <td class="py-3 px-4 text-sm text-slate-400">${u.phone || '—'}</td>
          <td class="py-3 px-4 text-sm">${statusBadge}</td>
          <td class="py-3 px-4 text-sm text-slate-400 text-xs">${new Date(u.created_at).toLocaleDateString()}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-rose-400">Error: ${err.message}</td></tr>`;
  }
}

async function renderAdminCourses(courses) {
  const container = document.getElementById('admin-courses-grid');
  if (!container) return;

  if (courses.length === 0) {
    container.innerHTML = '<div class="col-span-3 text-center py-8 text-slate-400">No academic courses registered yet.</div>';
    return;
  }

  container.innerHTML = courses.map(c => `
    <div class="glass-panel p-5 rounded-2xl border border-slate-700/60 hover:border-indigo-500/50 transition">
      <div class="flex items-center justify-between mb-3">
        <span class="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 font-mono text-xs font-bold border border-indigo-500/20">${c.code}</span>
        <span class="text-xs text-slate-400">Sem ${c.semester} • ${c.academic_year}</span>
      </div>
      <h4 class="text-base font-bold text-white mb-1">${c.name}</h4>
      <p class="text-xs text-slate-400 mb-4">${c.department} Department</p>
      <div class="flex items-center justify-between text-xs text-slate-300 pt-3 border-t border-slate-800">
        <span>👨‍🎓 ${c.total_students || 0} Students</span>
        <span>📚 ${c.total_subjects || 0} Subjects</span>
      </div>
    </div>
  `).join('');
}

async function renderAdminAuditLogs() {
  const container = document.getElementById('admin-audit-table-body');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-slate-400">Loading audit trail...</td></tr>';

  try {
    const res = await api.getAuditLogs({ limit: 15 });
    const logs = res.data || [];

    if (logs.length === 0) {
      container.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-slate-400">No audit records found.</td></tr>';
      return;
    }

    container.innerHTML = logs.map(l => {
      let detailsPreview = '—';
      try {
        const parsed = typeof l.details === 'string' ? JSON.parse(l.details) : l.details;
        detailsPreview = JSON.stringify(parsed);
      } catch (e) {
        detailsPreview = String(l.details);
      }

      return `
        <tr class="border-b border-slate-800/80 text-xs hover:bg-slate-800/30">
          <td class="py-2.5 px-3 font-mono text-indigo-300">${new Date(l.created_at).toLocaleString()}</td>
          <td class="py-2.5 px-3 font-semibold text-white">${l.action}</td>
          <td class="py-2.5 px-3 text-slate-400">${l.user_email || 'System'}</td>
          <td class="py-2.5 px-3 text-slate-400">${l.entity}</td>
          <td class="py-2.5 px-3 text-slate-400 font-mono max-w-xs truncate" title="${detailsPreview}">${detailsPreview}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-rose-400">Error loading audit: ${err.message}</td></tr>`;
  }
}

function setupAdminSettings(settings) {
  const thresholdInput = document.getElementById('setting-threshold');
  const lateWeightInput = document.getElementById('setting-late-weight');
  const form = document.getElementById('admin-settings-form');

  if (thresholdInput) thresholdInput.value = settings.low_attendance_threshold || '75';
  if (lateWeightInput) lateWeightInput.value = settings.late_attendance_weight || '0.5';

  if (form && !form.dataset.bound) {
    form.dataset.bound = 'true';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const threshold = thresholdInput.value;
        const lateWeight = lateWeightInput.value;

        await api.updateSettings({
          low_attendance_threshold: threshold,
          late_attendance_weight: lateWeight
        });

        showToast('System settings updated successfully!', 'success');
        const elStat = document.getElementById('admin-stat-threshold');
        if (elStat) elStat.textContent = `${threshold}%`;
      } catch (err) {
        showToast(err.message || 'Failed to update settings', 'error');
      }
    });
  }
}

function renderAdminChart(studentsCount, facultyCount, coursesCount) {
  const canvas = document.getElementById('admin-distribution-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (adminStatsChart) adminStatsChart.destroy();

  const ctx = canvas.getContext('2d');
  adminStatsChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Enrolled Students', 'Faculty Instructors', 'Academic Courses'],
      datasets: [{
        data: [studentsCount || 5, facultyCount || 2, coursesCount || 2],
        backgroundColor: ['#6366f1', '#10b981', '#f59e0b'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
        }
      },
      cutout: '70%'
    }
  });
}

// User Creation Modal setup
function setupCreateUserModal() {
  const btnOpen = document.getElementById('btn-open-create-user');
  const modal = document.getElementById('modal-create-user');
  const btnClose = document.getElementById('btn-close-create-user');
  const form = document.getElementById('form-create-user');
  const roleSelect = document.getElementById('create-user-role');
  const studentFields = document.getElementById('create-user-student-fields');
  const facultyFields = document.getElementById('create-user-faculty-fields');

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => modal.classList.remove('hidden'));
  }
  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  }

  if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'student') {
        studentFields?.classList.remove('hidden');
        facultyFields?.classList.add('hidden');
      } else if (val === 'faculty') {
        studentFields?.classList.add('hidden');
        facultyFields?.classList.remove('hidden');
      } else {
        studentFields?.classList.add('hidden');
        facultyFields?.classList.add('hidden');
      }
    });
  }

  if (form && !form.dataset.bound) {
    form.dataset.bound = 'true';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const role = roleSelect.value;
        const payload = {
          email: document.getElementById('create-user-email').value.trim(),
          password: document.getElementById('create-user-password').value,
          role,
          firstName: document.getElementById('create-user-firstname').value.trim(),
          lastName: document.getElementById('create-user-lastname').value.trim(),
          phone: document.getElementById('create-user-phone').value.trim()
        };

        if (role === 'student') {
          payload.studentData = {
            rollNumber: document.getElementById('create-student-roll').value.trim(),
            courseId: parseInt(document.getElementById('create-student-course').value || '1', 10),
            semester: parseInt(document.getElementById('create-student-sem').value || '1', 10),
            section: 'A'
          };
        } else if (role === 'faculty') {
          payload.facultyData = {
            employeeId: document.getElementById('create-faculty-empid').value.trim(),
            department: document.getElementById('create-faculty-dept').value.trim()
          };
        }

        await api.createUser(payload);
        showToast('User created successfully!', 'success');
        modal.classList.add('hidden');
        form.reset();
        renderAdminUsersTable();
      } catch (err) {
        showToast(err.message || 'Failed to create user', 'error');
      }
    });
  }
}

window.loadAdminDashboard = loadAdminDashboard;
window.renderAdminUsersTable = renderAdminUsersTable;
window.setupCreateUserModal = setupCreateUserModal;
