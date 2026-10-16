/**
 * Main Application Orchestrator & Router
 */

document.addEventListener('DOMContentLoaded', () => {
  setupApp();
});

function setupApp() {
  setupAuth();
  setupCreateUserModal();

  // Listen for hash changes
  window.addEventListener('hashchange', handleRouteChange);
  window.addEventListener('auth-changed', () => {
    updateNavState();
    handleRouteChange();
  });

  // Mobile sidebar toggler
  const sidebarBtn = document.getElementById('mobile-sidebar-toggle');
  const sidebar = document.getElementById('app-sidebar');
  if (sidebarBtn && sidebar) {
    sidebarBtn.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });
  }

  // Notifications dropdown
  setupNotificationsDropdown();

  // Initial routing
  updateNavState();
  handleRouteChange();
}

function updateNavState() {
  const user = api.getUser();
  const token = api.getToken();

  const appLayout = document.getElementById('app-layout');
  const authLayout = document.getElementById('auth-layout');

  if (!token || !user) {
    appLayout?.classList.add('hidden');
    authLayout?.classList.remove('hidden');
    return;
  }

  appLayout?.classList.remove('hidden');
  authLayout?.classList.add('hidden');

  // Update header user profile
  const userNameEl = document.getElementById('header-user-name');
  const userRoleEl = document.getElementById('header-user-role');
  const userAvatarEl = document.getElementById('header-user-avatar');

  if (userNameEl) userNameEl.textContent = `${user.firstName} ${user.lastName}`;
  if (userRoleEl) userRoleEl.textContent = user.role.toUpperCase();
  if (userAvatarEl) userAvatarEl.textContent = user.firstName.charAt(0);

  // Role-based sidebar menu items visibility
  const adminLinks = document.querySelectorAll('.nav-role-admin');
  const facultyLinks = document.querySelectorAll('.nav-role-faculty');
  const studentLinks = document.querySelectorAll('.nav-role-student');

  adminLinks.forEach(el => el.classList.toggle('hidden', user.role !== 'admin'));
  facultyLinks.forEach(el => el.classList.toggle('hidden', !['admin', 'faculty'].includes(user.role)));
  studentLinks.forEach(el => el.classList.toggle('hidden', user.role !== 'student'));

  // Fetch unread notifications
  fetchNotifications();
}

function handleRouteChange() {
  const token = api.getToken();
  const user = api.getUser();
  const hash = window.location.hash || '#login';

  // If not authenticated, force login view
  if (!token || !user) {
    showView('view-login');
    return;
  }

  // Active navigation link highlight
  document.querySelectorAll('.nav-item').forEach(link => {
    if (link.getAttribute('href') === hash) {
      link.classList.add('bg-indigo-600', 'text-white', 'shadow-lg', 'shadow-indigo-600/30');
      link.classList.remove('text-slate-400', 'hover:bg-slate-800');
    } else {
      link.classList.remove('bg-indigo-600', 'text-white', 'shadow-lg', 'shadow-indigo-600/30');
      link.classList.add('text-slate-400', 'hover:bg-slate-800');
    }
  });

  // Switch views
  switch (hash) {
    case '#admin-dashboard':
      if (user.role === 'admin') {
        showView('view-admin-dashboard');
        loadAdminDashboard();
      } else {
        redirectAfterLogin(user.role);
      }
      break;

    case '#faculty-dashboard':
      if (['admin', 'faculty'].includes(user.role)) {
        showView('view-faculty-dashboard');
        loadFacultyDashboard();
      } else {
        redirectAfterLogin(user.role);
      }
      break;

    case '#student-dashboard':
      showView('view-student-dashboard');
      loadStudentDashboard();
      break;

    case '#reports':
      if (['admin', 'faculty'].includes(user.role)) {
        showView('view-reports');
        // If subject select has a value, load report
        const sSelect = document.getElementById('faculty-report-subject-select');
        if (sSelect && sSelect.value) {
          loadFacultyReport(sSelect.value);
        }
      } else {
        redirectAfterLogin(user.role);
      }
      break;

    case '#ai-insights':
      showView('view-ai-insights');
      loadAiInsightsView();
      break;

    case '#settings':
      showView('view-settings');
      break;

    case '#login':
    default:
      if (token && user) {
        redirectAfterLogin(user.role);
      } else {
        showView('view-login');
      }
      break;
  }
}

function showView(viewId) {
  document.querySelectorAll('.app-view').forEach(view => {
    if (view.id === viewId) {
      view.classList.remove('hidden');
      view.classList.add('animate-fade-in');
    } else {
      view.classList.add('hidden');
    }
  });
}

async function fetchNotifications() {
  try {
    const res = await api.getNotifications();
    const badge = document.getElementById('notification-badge');
    const list = document.getElementById('notification-list');

    if (badge) {
      if (res.unreadCount > 0) {
        badge.textContent = res.unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    if (list) {
      const notifs = res.data || [];
      if (notifs.length === 0) {
        list.innerHTML = '<div class="p-4 text-xs text-slate-400 text-center">No notifications</div>';
        return;
      }

      list.innerHTML = notifs.map(n => `
        <div class="p-3 border-b border-slate-800 hover:bg-slate-800/40 transition cursor-pointer text-xs ${!n.is_read ? 'bg-indigo-950/20' : ''}" onclick="markNotifRead(${n.id})">
          <div class="font-bold text-white mb-0.5 flex items-center justify-between">
            <span>${n.title}</span>
            <span class="text-[10px] text-slate-500 font-mono">${new Date(n.created_at).toLocaleDateString()}</span>
          </div>
          <p class="text-slate-300 leading-relaxed">${n.message}</p>
        </div>
      `).join('');
    }
  } catch (err) {
    console.warn('Could not load notifications:', err.message);
  }
}

async function markNotifRead(id) {
  try {
    await api.markNotificationRead(id);
    fetchNotifications();
  } catch (e) {}
}

function setupNotificationsDropdown() {
  const btn = document.getElementById('btn-notifications-toggle');
  const dropdown = document.getElementById('notifications-dropdown');

  if (btn && dropdown) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== btn) {
        dropdown.classList.add('hidden');
      }
    });
  }
}

window.showView = showView;
window.markNotifRead = markNotifRead;
