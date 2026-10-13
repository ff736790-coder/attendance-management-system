/**
 * Student Dashboard & Attendance Portal Module
 */

async function loadStudentDashboard() {
  const container = document.getElementById('student-dashboard-content');
  if (!container) return;

  container.innerHTML = `
    <div class="flex items-center justify-center py-16">
      <div class="animate-spin text-3xl text-indigo-500">⟳</div>
      <span class="ml-3 text-slate-400">Fetching personal attendance records...</span>
    </div>
  `;

  try {
    const user = api.getUser();
    const studentId = user.studentId || 1;

    const res = await api.getStudentSummary(studentId);
    const data = res.data;
    const student = data.student;
    const overall = data.overall;
    const threshold = data.threshold || 75;
    const subjects = data.subjects || [];
    const history = data.recentHistory || [];

    // Determine color styling based on percentage
    const isAtRisk = overall.percentage < threshold;
    const pctColor = isAtRisk ? 'text-rose-400' : (overall.percentage >= 85 ? 'text-emerald-400' : 'text-indigo-400');
    const barColor = isAtRisk ? 'bg-rose-500' : (overall.percentage >= 85 ? 'bg-emerald-500' : 'bg-indigo-500');

    container.innerHTML = `
      <!-- Warning Banner if below threshold -->
      ${isAtRisk ? `
        <div class="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-600/50 flex flex-wrap items-center justify-between gap-4 animate-fade-in shadow-xl shadow-rose-950/40">
          <div class="flex items-center gap-3">
            <span class="text-3xl">⚠️</span>
            <div>
              <h4 class="font-bold text-rose-200 text-sm">Low Attendance Warning Notice</h4>
              <p class="text-xs text-rose-300/80">Your cumulative attendance (${overall.percentage}%) is currently below the mandatory institutional threshold of ${threshold}%. You may face exam debarment if not improved.</p>
            </div>
          </div>
          <button onclick="requestStudentAiAdvice(${student.id})" class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-rose-600/30">
            <span>✨</span> Get AI Recovery Plan
          </button>
        </div>
      ` : `
        <div class="mb-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-600/30 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🎉</span>
            <div>
              <h4 class="font-bold text-emerald-200 text-sm">Attendance in Good Standing</h4>
              <p class="text-xs text-emerald-300/80">Your overall attendance of ${overall.percentage}% comfortably meets the ${threshold}% requirement. Keep up the consistent effort!</p>
            </div>
          </div>
          <button onclick="requestStudentAiAdvice(${student.id})" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-xs font-semibold transition">
            Personal AI Guidance
          </button>
        </div>
      `}

      <!-- Top Summary Header & Metric Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- Overall Gauge Card -->
        <div class="glass-panel p-6 rounded-3xl border border-slate-700/60 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs uppercase font-bold tracking-wider text-slate-400">Cumulative Attendance</span>
            <span class="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">Target: ${threshold}%</span>
          </div>
          <div class="flex items-baseline gap-2 my-2">
            <div class="text-5xl font-extrabold ${pctColor}">${overall.percentage}%</div>
            <span class="text-xs text-slate-400 font-medium">overall rate</span>
          </div>
          <div>
            <div class="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-2">
              <div class="${barColor} h-full rounded-full transition-all duration-700" style="width: ${Math.min(overall.percentage, 100)}%"></div>
            </div>
            <div class="flex justify-between text-xs text-slate-400">
              <span>Attended: ${overall.attended}</span>
              <span>Eligible: ${overall.eligible} Classes</span>
            </div>
          </div>
        </div>

        <!-- Student Profile Card -->
        <div class="glass-panel p-6 rounded-3xl border border-slate-700/60 flex flex-col justify-between">
          <div class="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">Academic Profile</div>
          <div>
            <h3 class="text-xl font-bold text-white mb-1">${student.name}</h3>
            <div class="text-xs font-mono text-indigo-300 font-semibold mb-2">Roll No: ${student.rollNumber}</div>
            <p class="text-xs text-slate-400">${student.course} • Sem ${student.semester} (Sec ${student.section})</p>
          </div>
          <div class="pt-3 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
            <span>Late Weight: ${data.lateWeight}x</span>
            <span class="text-emerald-400 font-semibold">Active Enrollment</span>
          </div>
        </div>

        <!-- Attendance Breakdown Summary -->
        <div class="glass-panel p-6 rounded-3xl border border-slate-700/60 flex flex-col justify-between">
          <div class="text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">Class Attendance Breakdown</div>
          <div class="grid grid-cols-3 gap-3 text-center my-auto">
            <div class="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/30">
              <div class="text-2xl font-bold text-emerald-400">${overall.present}</div>
              <div class="text-xs text-emerald-300/70 font-medium">Present</div>
            </div>
            <div class="p-3 rounded-2xl bg-amber-950/30 border border-amber-800/30">
              <div class="text-2xl font-bold text-amber-400">${overall.late}</div>
              <div class="text-xs text-amber-300/70 font-medium">Late</div>
            </div>
            <div class="p-3 rounded-2xl bg-rose-950/30 border border-rose-800/30">
              <div class="text-2xl font-bold text-rose-400">${overall.absent}</div>
              <div class="text-xs text-rose-300/70 font-medium">Absent</div>
            </div>
          </div>
          <div class="text-xs text-slate-400 text-center pt-2">Late sessions count as ${data.lateWeight} credit each.</div>
        </div>
      </div>

      <!-- Subject-wise Attendance Cards -->
      <h3 class="text-base font-bold text-white mb-4 flex items-center gap-2">
        <span>📚</span> Subject-wise Attendance Records
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        ${subjects.map(sub => {
          const subAtRisk = sub.isLowAttendance;
          const subPctColor = subAtRisk ? 'text-rose-400' : 'text-emerald-400';
          const subBarColor = subAtRisk ? 'bg-rose-500' : 'bg-emerald-500';

          return `
            <div class="glass-panel p-5 rounded-2xl border ${subAtRisk ? 'border-rose-500/40 bg-rose-950/10' : 'border-slate-700/60'} hover:border-indigo-500/50 transition">
              <div class="flex items-center justify-between mb-2">
                <span class="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 font-mono text-xs font-bold border border-indigo-500/20">${sub.code}</span>
                <span class="text-xs font-semibold ${subAtRisk ? 'text-rose-400' : 'text-emerald-400'}">${subAtRisk ? '⚠️ Below 75%' : '✓ Satisfactory'}</span>
              </div>
              <h4 class="font-bold text-white text-sm mb-3 line-clamp-1" title="${sub.name}">${sub.name}</h4>
              
              <div class="flex items-baseline justify-between mb-2">
                <div class="text-3xl font-extrabold ${subPctColor}">${sub.percentage}%</div>
                <div class="text-xs text-slate-400">${sub.attended} / ${sub.eligible} classes</div>
              </div>

              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                <div class="${subBarColor} h-full rounded-full transition-all duration-500" style="width: ${Math.min(sub.percentage, 100)}%"></div>
              </div>

              <div class="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <span>Present: <b class="text-emerald-400">${sub.present}</b></span>
                <span>Late: <b class="text-amber-400">${sub.late}</b></span>
                <span>Absent: <b class="text-rose-400">${sub.absent}</b></span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Recent Attendance History Table -->
      <div class="glass-panel rounded-2xl border border-slate-700/60 overflow-hidden">
        <div class="p-4 border-b border-slate-800 flex items-center justify-between">
          <h4 class="text-sm font-bold text-white uppercase tracking-wider">Recent Class Log History</h4>
          <span class="text-xs text-slate-400">Last 20 Sessions</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead class="bg-slate-800/60 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th class="py-3 px-4">Date</th>
                <th class="py-3 px-4">Subject</th>
                <th class="py-3 px-4">Lecture Topic</th>
                <th class="py-3 px-4">Faculty</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800 text-sm">
              ${history.length === 0 ? '<tr><td colspan="6" class="text-center py-6 text-slate-400">No attendance records logged yet.</td></tr>' : ''}
              ${history.map(h => {
                let badge = '';
                if (h.status === 'present') badge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Present</span>';
                else if (h.status === 'late') badge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Late</span>';
                else badge = '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Absent</span>';

                return `
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="py-3 px-4 font-mono text-xs text-slate-300 font-semibold">${h.session_date}</td>
                    <td class="py-3 px-4">
                      <div class="font-bold text-white text-xs">${h.subject_code}</div>
                      <div class="text-xs text-slate-400 truncate max-w-xs">${h.subject_name}</div>
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-300">${h.topic || 'Regular Class'}</td>
                    <td class="py-3 px-4 text-xs text-slate-400">${h.faculty_first_name} ${h.faculty_last_name}</td>
                    <td class="py-3 px-4">${badge}</td>
                    <td class="py-3 px-4 text-xs text-slate-500">${h.remarks || '—'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="p-8 text-center text-rose-400">Failed to load student dashboard: ${err.message}</div>`;
  }
}

window.loadStudentDashboard = loadStudentDashboard;
