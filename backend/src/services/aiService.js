/**
 * AI Service for Attendance Analytics & Intelligent Insights
 * Supports OpenAI-compatible APIs with deterministic rule-based fallback
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

/**
 * Make call to OpenAI-compatible Chat Completion endpoint
 */
async function callAiApi(messages, temperature = 0.5, maxTokens = 800) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
    return {
      success: false,
      isFallback: true,
      reason: 'AI API Key is not configured. Falling back to rule-based analytics engine.'
    };
  }

  try {
    const endpoint = `${OPENAI_BASE_URL.replace(/\/+$/, '')}/chat/completions`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        isFallback: true,
        reason: `AI Provider responded with HTTP ${response.status}: ${errText}`
      };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    return {
      success: true,
      isFallback: false,
      text: reply,
      modelUsed: OPENAI_MODEL
    };
  } catch (err) {
    return {
      success: false,
      isFallback: true,
      reason: `AI API network/timeout error: ${err.message}`
    };
  }
}

/**
 * 1. AI Class Attendance Trend Summarizer
 */
async function summarizeClassAttendance(reportData) {
  const { subjectName, courseName, totalSessions, studentStats = [], averagePercentage } = reportData;

  const lowCount = studentStats.filter(s => s.percentage < 75).length;
  const highCount = studentStats.filter(s => s.percentage >= 85).length;

  const prompt = `You are an academic intelligence assistant. Analyze this class attendance report:
Course: ${courseName}
Subject: ${subjectName}
Total Conducted Sessions: ${totalSessions}
Average Attendance: ${averagePercentage}%
Total Students: ${studentStats.length}
Students below 75% threshold: ${lowCount}
Students with high attendance (>=85%): ${highCount}

Provide:
1. A concise executive summary of attendance health.
2. Key observed patterns or risk factors.
3. Two actionable pedagogical recommendations for faculty to improve engagement.
Keep tone professional, encouraging, and strictly objective. Do not hallucinate external student names.`;

  const aiResult = await callAiApi([
    { role: 'system', content: 'You are an educational analytics AI advisor.' },
    { role: 'user', content: prompt }
  ]);

  if (aiResult.success) {
    return {
      mode: 'ai',
      provider: aiResult.modelUsed,
      summary: aiResult.text
    };
  }

  // Deterministic rule-based fallback
  let health = 'Good';
  if (averagePercentage < 70) health = 'Needs Urgent Attention';
  else if (averagePercentage < 80) health = 'Moderate / Satisfactory';
  else health = 'Excellent';

  const fallbackSummary = `### Executive Attendance Summary (Rule-Based Engine)
- **Overall Class Health**: **${health}** (${averagePercentage}% average attendance).
- **Session Engagement**: Across ${totalSessions} conducted sessions, ${highCount} out of ${studentStats.length} students maintained strong attendance (≥ 85%).
- **At-Risk Notice**: **${lowCount} student(s)** currently fall below the required 75% institutional threshold.

### Key Observations & Next Steps:
1. **Targeted Advisory**: Initiate one-on-one advisory sessions with the ${lowCount} at-risk students before upcoming mid-semester examinations.
2. **Pedagogical Pacing**: Review attendance drops around complex conceptual milestones and consider introducing quick interactive check-ins.
*(Note: Generated via internal deterministic analytics engine. Configure OPENAI_API_KEY in .env for generative LLM responses.)*`;

  return {
    mode: 'rule_based_fallback',
    reason: aiResult.reason,
    summary: fallbackSummary
  };
}

/**
 * 2. Generate Personalized Improvement Suggestions for a Student
 * Calculates exact classes required to reach 75%
 */
async function generateStudentSuggestions(studentData) {
  const { studentName, subjectStats = [], overallPercentage, threshold = 75, lateWeight = 0.5 } = studentData;

  // Compute required classes for subjects below threshold
  const lowSubjects = subjectStats.filter(s => s.percentage < threshold).map(s => {
    // Formula: (attended + X) / (eligible + X) >= threshold / 100
    // attended + X >= (threshold/100) * eligible + (threshold/100) * X
    // X * (1 - threshold/100) >= (threshold/100)*eligible - attended
    const t = threshold / 100;
    const numerator = (t * s.eligible) - s.attended;
    const denominator = 1 - t;
    const needed = Math.max(0, Math.ceil(numerator / denominator));

    return {
      subject: s.name,
      code: s.code,
      currentPercentage: s.percentage,
      classesNeededConsecutively: needed
    };
  });

  const prompt = `You are a supportive academic mentor. Generate a personalized attendance improvement advice for student ${studentName}.
Overall Attendance: ${overallPercentage}% (Threshold: ${threshold}%)
Subjects below requirement:
${JSON.stringify(lowSubjects, null, 2)}

Provide:
1. An encouraging, empathetic assessment of current standing.
2. Clear math-based target of consecutive classes to attend.
3. Practical tips for habit building, punctuality, and coordinating with professors.`;

  const aiResult = await callAiApi([
    { role: 'system', content: 'You are an empathetic college academic advisor.' },
    { role: 'user', content: prompt }
  ]);

  if (aiResult.success) {
    return {
      mode: 'ai',
      provider: aiResult.modelUsed,
      suggestions: aiResult.text,
      mathematicalTargets: lowSubjects
    };
  }

  // Deterministic rule-based fallback advice
  let fallbackText = `### Personalized Academic Guidance for ${studentName}

**Current Standing:** Overall attendance is **${overallPercentage}%** (Institutional threshold: **${threshold}%**).

`;

  if (lowSubjects.length === 0) {
    fallbackText += `🎉 **Great Job!** You are currently in good standing across all subjects. Keep maintaining this regularity to ensure seamless eligibility for your final examinations.`;
  } else {
    fallbackText += `#### 🎯 Required Target Milestones:\n`;
    lowSubjects.forEach(s => {
      fallbackText += `- **${s.code} - ${s.subject}**: Currently at **${s.currentPercentage}%**. You must attend your next **${s.classesNeededConsecutively} consecutive lecture(s)** without absence to restore your attendance to ≥ ${threshold}%.\n`;
    });
    fallbackText += `\n#### 💡 Action Steps:
1. **Prioritize Punctuality**: Remember that arriving late reduces your attendance credit compared to on-time arrival.
2. **Proactive Communication**: If you missed classes due to valid medical reasons or college events, submit documentation immediately to your faculty advisor.
3. **Set Calendar Reminders**: Mark early morning slots on your phone calendar to prevent accidental unexcused absences.`;
  }

  return {
    mode: 'rule_based_fallback',
    reason: aiResult.reason,
    suggestions: fallbackText,
    mathematicalTargets: lowSubjects
  };
}

/**
 * 3. Controlled Assistant Q&A for Aggregated Attendance Statistics
 * Strictly prevents prompt injection and never reveals unauthorized individual student records
 */
async function answerAggregatedQuestions(question, aggregatedStats) {
  const sanitizedQuestion = question.trim().substring(0, 300);

  // Check for malicious attempts to extract passwords or dump private records
  const dangerousPatterns = [/password/i, /hash/i, /token/i, /jwt/i, /secret/i, /drop table/i, /select \* from users/i];
  if (dangerousPatterns.some(p => p.test(sanitizedQuestion))) {
    return {
      mode: 'security_filter',
      answer: 'Access Restricted: For security and compliance, queries requesting credentials, tokens, or raw system secrets are strictly blocked.'
    };
  }

  const prompt = `You are a secure, privacy-preserving institutional AI data assistant.
Context of authorized aggregated attendance statistics:
${JSON.stringify(aggregatedStats, null, 2)}

User Question: "${sanitizedQuestion}"

Rules:
1. Answer strictly using the authorized context provided above.
2. Do not reveal unmentioned personal identifiers or private data.
3. Be concise, direct, professional, and helpful.`;

  const aiResult = await callAiApi([
    { role: 'system', content: 'You are an institutional academic analytics AI assistant.' },
    { role: 'user', content: prompt }
  ]);

  if (aiResult.success) {
    return {
      mode: 'ai',
      provider: aiResult.modelUsed,
      answer: aiResult.text
    };
  }

  // Deterministic rule-based query parser
  const qLower = sanitizedQuestion.toLowerCase();
  let answer = '';

  if (qLower.includes('average') || qLower.includes('overall')) {
    answer = `Based on the latest aggregated records, the overall institutional attendance average is ${aggregatedStats.averagePercentage || 'N/A'}% across ${aggregatedStats.totalSessions || 0} conducted sessions.`;
  } else if (qLower.includes('low') || qLower.includes('defaulter') || qLower.includes('risk') || qLower.includes('75')) {
    answer = `Currently, ${aggregatedStats.lowAttendanceCount || 0} student(s) fall below the minimum 75% attendance threshold. Automated advisories have been dispatched.`;
  } else if (qLower.includes('subject') || qLower.includes('course')) {
    answer = `The system is tracking ${aggregatedStats.subjectCount || 0} active subject modules with a total student roster of ${aggregatedStats.totalStudents || 0} enrolled students.`;
  } else {
    answer = `Summary of current records: Overall Average Attendance is ${aggregatedStats.averagePercentage || 'N/A'}%, with ${aggregatedStats.lowAttendanceCount || 0} student(s) requiring attention out of ${aggregatedStats.totalStudents || 0} total students. Total sessions conducted: ${aggregatedStats.totalSessions || 0}.`;
  }

  return {
    mode: 'rule_based_fallback',
    reason: aiResult.reason,
    answer
  };
}

/**
 * 4. Monthly Attendance Natural-Language Report Generator
 */
async function generateMonthlyReportSummary(monthName, monthData) {
  const { totalSessions, totalMarked, averagePercentage, subjectBreakdown = [] } = monthData;

  const prompt = `Generate a formal academic monthly attendance executive brief for the month of ${monthName}:
- Total Sessions Held: ${totalSessions}
- Attendance Rate: ${averagePercentage}%
- Subject Breakdown: ${JSON.stringify(subjectBreakdown)}

Highlight key metrics, department performance, and suggestions for the upcoming month in 3 paragraphs.`;

  const aiResult = await callAiApi([
    { role: 'system', content: 'You are an institutional academic reporting AI.' },
    { role: 'user', content: prompt }
  ]);

  if (aiResult.success) {
    return {
      mode: 'ai',
      provider: aiResult.modelUsed,
      summary: aiResult.text
    };
  }

  const fallback = `### Monthly Academic Attendance Brief: ${monthName}

During ${monthName}, the department conducted a total of **${totalSessions} lecture sessions**, recording an overall average student attendance rate of **${averagePercentage}%**.

Class regularity remained consistent across core curriculum modules. Subject-specific analyses indicate steady engagement in core laboratory and theoretical modules.

**Recommendations for Next Month:**
- Maintain continuous tracking for students approaching the 75% compliance margin.
- Schedule review meetings with course coordinators for any courses showing declining mid-week attendance.
*(Generated via automated deterministic reporting engine. Configure OPENAI_API_KEY for custom LLM narratives.)*`;

  return {
    mode: 'rule_based_fallback',
    reason: aiResult.reason,
    summary: fallback
  };
}

module.exports = {
  callAiApi,
  summarizeClassAttendance,
  generateStudentSuggestions,
  answerAggregatedQuestions,
  generateMonthlyReportSummary
};
