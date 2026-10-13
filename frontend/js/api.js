/**
 * API Client & Network Service
 */

const API_BASE = '/api';

const api = {
  getToken() {
    return localStorage.getItem('ams_token');
  },

  setToken(token) {
    localStorage.setItem('ams_token', token);
  },

  getUser() {
    const u = localStorage.getItem('ams_user');
    return u ? JSON.parse(u) : null;
  },

  setUser(user) {
    localStorage.setItem('ams_user', JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem('ams_token');
    localStorage.removeItem('ams_user');
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      if (response.status === 401) {
        // Token expired or invalid
        this.clearAuth();
        window.location.hash = '#login';
        window.dispatchEvent(new CustomEvent('auth-changed'));
        throw new Error('Session expired. Please log in again.');
      }

      // Check if response is CSV or file download
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/csv')) {
        return await response.text();
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Request failed with HTTP ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  // Auth endpoints
  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.token) {
      this.setToken(res.token);
      this.setUser(res.user);
    }
    return res;
  },

  async getProfile() {
    return await this.request('/auth/profile');
  },

  async changePassword(currentPassword, newPassword) {
    return await this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  // Attendance & Sessions
  async getSessions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/attendance/sessions?${query}`);
  },

  async getSessionById(sessionId) {
    return await this.request(`/attendance/sessions/${sessionId}`);
  },

  async createSession(sessionData) {
    return await this.request('/attendance/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  },

  async markAttendance(sessionId, records) {
    return await this.request(`/attendance/sessions/${sessionId}/records`, {
      method: 'POST',
      body: JSON.stringify({ records })
    });
  },

  async updateRecord(recordId, status, remarks) {
    return await this.request(`/attendance/records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, remarks })
    });
  },

  async getStudentSummary(studentId) {
    return await this.request(`/attendance/student/${studentId}`);
  },

  // Reports
  async getSubjectReport(subjectId) {
    return await this.request(`/reports/subject/${subjectId}`);
  },

  async getClassReport(courseId) {
    return await this.request(`/reports/class/${courseId}`);
  },

  async exportCsvUrl(type, id) {
    return `${API_BASE}/reports/export/csv?type=${type}&id=${id}`;
  },

  // Users & Academic Resources
  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/users/users?${query}`);
  },

  async createUser(userData) {
    return await this.request('/users/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async getStudents(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/users/students?${query}`);
  },

  async getFaculty() {
    return await this.request('/users/faculty');
  },

  async getCourses() {
    return await this.request('/users/courses');
  },

  async getSubjects(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/users/subjects?${query}`);
  },

  async assignFaculty(facultyId, subjectId, academicTerm) {
    return await this.request('/users/assign-faculty', {
      method: 'POST',
      body: JSON.stringify({ facultyId, subjectId, academicTerm })
    });
  },

  // AI Insights
  async summarizeClass(subjectId) {
    return await this.request('/ai/summarize-class', {
      method: 'POST',
      body: JSON.stringify({ subjectId })
    });
  },

  async getStudentSuggestions(studentId) {
    return await this.request(`/ai/student-suggestions/${studentId}`);
  },

  async askAssistant(question) {
    return await this.request('/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ question })
    });
  },

  async getMonthlySummary(month) {
    return await this.request(`/ai/monthly-summary?month=${encodeURIComponent(month || '')}`);
  },

  // System & Health
  async getHealth() {
    return await this.request('/system/health');
  },

  async getSettings() {
    return await this.request('/system/settings');
  },

  async updateSettings(settings) {
    return await this.request('/system/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings })
    });
  },

  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return await this.request(`/system/audit-logs?${query}`);
  },

  async getNotifications() {
    return await this.request('/system/notifications');
  },

  async markNotificationRead(id) {
    return await this.request(`/system/notifications/${id}/read`, {
      method: 'PUT'
    });
  }
};

/**
 * Toast Notification System
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-emerald-900/90 text-emerald-200 border-emerald-700/60',
    error: 'bg-rose-900/90 text-rose-200 border-rose-700/60',
    warning: 'bg-amber-900/90 text-amber-200 border-amber-700/60',
    info: 'bg-indigo-900/90 text-indigo-200 border-indigo-700/60'
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.className = `toast flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium backdrop-blur-md animate-fade-in ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    <span class="font-bold text-base">${icons[type] || '•'}</span>
    <span class="flex-1">${message}</span>
    <button class="opacity-70 hover:opacity-100 text-sm ml-2" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

window.api = api;
window.showToast = showToast;
