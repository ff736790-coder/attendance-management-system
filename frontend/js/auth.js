/**
 * Authentication & Session Management Module
 */

function setupAuth() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="animate-spin inline-block mr-2">⟳</span> Signing in...';

        const res = await api.login(email, password);
        showToast(`Welcome back, ${res.user.firstName}!`, 'success');

        // Route to role-specific default view
        redirectAfterLogin(res.user.role);
      } catch (err) {
        showToast(err.message || 'Login failed', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In to Portal';
      }
    });
  }

  // Quick Demo Account Click Handlers
  document.querySelectorAll('[data-demo-account]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const role = btn.dataset.demoAccount;
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-password');

      if (role === 'admin') {
        emailInput.value = 'admin@college.edu';
        passInput.value = 'Password@123';
      } else if (role === 'faculty') {
        emailInput.value = 'prof.sharma@college.edu';
        passInput.value = 'Password@123';
      } else if (role === 'student-normal') {
        emailInput.value = 'rahul.verma@college.edu';
        passInput.value = 'Password@123';
      } else if (role === 'student-low') {
        emailInput.value = 'amit.patel@college.edu';
        passInput.value = 'Password@123';
      }

      showToast(`Filled ${role} demo credentials. Click Sign In!`, 'info');
    });
  });

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      api.clearAuth();
      showToast('You have been logged out safely.', 'info');
      window.location.hash = '#login';
      window.dispatchEvent(new CustomEvent('auth-changed'));
    });
  }
}

function redirectAfterLogin(role) {
  if (role === 'admin') {
    window.location.hash = '#admin-dashboard';
  } else if (role === 'faculty') {
    window.location.hash = '#faculty-dashboard';
  } else if (role === 'student') {
    window.location.hash = '#student-dashboard';
  } else {
    window.location.hash = '#login';
  }
  window.dispatchEvent(new CustomEvent('auth-changed'));
}

window.setupAuth = setupAuth;
window.redirectAfterLogin = redirectAfterLogin;
