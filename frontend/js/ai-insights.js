/**
 * AI Insights, Analytics & Intelligent Assistant Module
 */

async function loadAiInsightsView() {
  const container = document.getElementById('ai-insights-view-content');
  if (!container) return;

  const user = api.getUser();
  const isAdminOrFaculty = ['admin', 'faculty'].includes(user?.role);

  // Populate subjects dropdown
  try {
    const subRes = await api.getSubjects();
    const subjects = subRes.data || [];
    const select = document.getElementById('ai-subject-select');
    if (select) {
      select.innerHTML = '<option value="">-- Choose Subject to Summarize --</option>' +
        subjects.map(s => `<option value="${s.id}">${s.code} - ${s.name}</option>`).join('');
    }

    // Populate students dropdown if admin or faculty
    if (isAdminOrFaculty) {
      const stRes = await api.getStudents();
      const students = stRes.data || [];
      const stSelect = document.getElementById('ai-student-select');
      if (stSelect) {
        stSelect.innerHTML = '<option value="">-- Choose Student for Recovery Guidance --</option>' +
          students.map(s => `<option value="${s.student_id}">${s.roll_number} - ${s.first_name} ${s.last_name}</option>`).join('');
      }
    }
  } catch (err) {
    console.warn('Could not populate AI subjects select:', err);
  }

  // Bind AI Assistant chat form
  setupAiAssistantChat();
}

// Request AI summary for a class
async function requestAiClassSummary(subjectId = null) {
  const sId = subjectId || document.getElementById('ai-subject-select')?.value;
  if (!sId) {
    showToast('Please select a subject first', 'warning');
    return;
  }

  const resultContainer = document.getElementById('ai-class-summary-result');
  if (!resultContainer) return;

  resultContainer.classList.remove('hidden');
  resultContainer.innerHTML = `
    <div class="flex items-center gap-3 text-indigo-400 py-6">
      <div class="animate-spin text-2xl">⟳</div>
      <span>Generating AI Class Attendance Summary...</span>
    </div>
  `;

  try {
    const res = await api.summarizeClass(sId);
    renderAiResponseCard(resultContainer, res, 'Class Attendance Intelligence Brief');
  } catch (err) {
    resultContainer.innerHTML = `<div class="p-4 rounded-xl bg-rose-950/40 text-rose-300 border border-rose-800">Error: ${err.message}</div>`;
  }
}

// Request AI advice for student
async function requestStudentAiAdvice(studentId = null) {
  let sId = studentId || document.getElementById('ai-student-select')?.value;
  const user = api.getUser();

  if (user?.role === 'student') {
    sId = user.studentId || 1;
  }

  if (!sId) {
    showToast('Please select a student', 'warning');
    return;
  }

  // Switch to AI Insights view if called from student dashboard
  window.location.hash = '#ai-insights';

  const resultContainer = document.getElementById('ai-student-advice-result');
  if (!resultContainer) return;

  resultContainer.classList.remove('hidden');
  resultContainer.innerHTML = `
    <div class="flex items-center gap-3 text-indigo-400 py-6">
      <div class="animate-spin text-2xl">⟳</div>
      <span>Formulating Personalized Recovery Guidance...</span>
    </div>
  `;

  try {
    const res = await api.getStudentSuggestions(sId);
    renderAiResponseCard(resultContainer, {
      mode: res.mode,
      summary: res.suggestions,
      provider: res.provider,
      reason: res.reason
    }, `Personalized Academic Plan for ${res.student?.name || 'Student'}`);
  } catch (err) {
    resultContainer.innerHTML = `<div class="p-4 rounded-xl bg-rose-950/40 text-rose-300 border border-rose-800">Error: ${err.message}</div>`;
  }
}

// Format and render AI response card
function renderAiResponseCard(container, data, title) {
  const isFallback = data.mode === 'rule_based_fallback';
  const badgeText = isFallback
    ? '⚙️ Deterministic Rule-Based Fallback Engine'
    : `✨ AI Model: ${data.provider || 'OpenAI'}`;
  const badgeStyle = isFallback
    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
    : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';

  // Format markdown headers, bold, bullets
  let formattedHtml = (data.summary || data.answer || '')
    .replace(/^### (.*$)/gim, '<h4 class="text-base font-bold text-white mt-3 mb-1">$1</h4>')
    .replace(/^#### (.*$)/gim, '<h5 class="text-sm font-bold text-indigo-300 mt-2 mb-1">$1</h5>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc text-slate-300">$1</li>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-slate-300">$1</li>')
    .replace(/\n\n/g, '<div class="h-2"></div>')
    .replace(/\n/g, '<br/>');

  container.innerHTML = `
    <div class="glass-panel p-6 rounded-2xl border border-slate-700/80 mt-4 animate-fade-in shadow-2xl">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <h4 class="text-base font-bold text-white flex items-center gap-2">
          <span>💡</span> ${title}
        </h4>
        <span class="px-2.5 py-1 text-xs font-semibold rounded-lg border ${badgeStyle}">${badgeText}</span>
      </div>
      <div class="text-sm text-slate-300 leading-relaxed font-sans prose prose-invert max-w-none">
        ${formattedHtml}
      </div>
      ${data.reason ? `
        <div class="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-500 flex items-center justify-between">
          <span>Engine Status: ${data.reason}</span>
          <span class="text-slate-400">Zero downtime guaranteed</span>
        </div>
      ` : ''}
    </div>
  `;
}

// Setup AI Assistant Q&A Chat
function setupAiAssistantChat() {
  const form = document.getElementById('ai-chat-form');
  const input = document.getElementById('ai-chat-input');
  const messagesBox = document.getElementById('ai-chat-messages');

  // Quick chips
  document.querySelectorAll('[data-chat-prompt]').forEach(chip => {
    chip.onclick = () => {
      if (input) {
        input.value = chip.dataset.chatPrompt;
        form?.dispatchEvent(new Event('submit'));
      }
    };
  });

  if (form && !form.dataset.bound) {
    form.dataset.bound = 'true';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const question = input.value.trim();
      if (!question) return;

      input.value = '';

      // Append user bubble
      appendChatBubble(messagesBox, 'user', question);

      // Append loading bubble
      const loadingBubble = appendChatBubble(messagesBox, 'assistant', '<span class="animate-pulse">Thinking & querying aggregated statistics...</span>');

      try {
        const res = await api.askAssistant(question);
        loadingBubble.remove();
        appendChatBubble(messagesBox, 'assistant', res.answer, res.mode === 'rule_based_fallback' ? '⚙️ Fallback' : '✨ AI');
      } catch (err) {
        loadingBubble.remove();
        appendChatBubble(messagesBox, 'assistant', `Error processing query: ${err.message}`);
      }
    });
  }
}

function appendChatBubble(container, sender, text, tag = '') {
  if (!container) return null;

  const bubble = document.createElement('div');
  const isUser = sender === 'user';

  bubble.className = `flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`;
  bubble.innerHTML = `
    <div class="max-w-xl rounded-2xl px-4 py-3 text-sm ${
      isUser
        ? 'bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-600/20'
        : 'glass-panel border border-slate-700/80 text-slate-200 rounded-bl-none shadow-xl'
    }">
      ${tag ? `<div class="text-[10px] uppercase font-bold tracking-wider text-indigo-400 mb-1">${tag}</div>` : ''}
      <div>${text}</div>
    </div>
  `;

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
  return bubble;
}

window.loadAiInsightsView = loadAiInsightsView;
window.requestAiClassSummary = requestAiClassSummary;
window.requestStudentAiAdvice = requestStudentAiAdvice;
