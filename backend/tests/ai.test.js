const { test, describe } = require('node:test');
const assert = require('node:assert');
const {
  summarizeClassAttendance,
  generateStudentSuggestions,
  answerAggregatedQuestions,
  callAiApi
} = require('../src/services/aiService');

describe('AI Analytics & Deterministic Fallback Engine Tests', () => {
  test('callAiApi handles missing API key with fallback flag', async () => {
    // When no key is set, returns fallback
    const res = await callAiApi([{ role: 'user', content: 'test' }]);
    assert.strictEqual(res.isFallback, true);
    assert.match(res.reason, /not configured/i);
  });

  test('summarizeClassAttendance returns deterministic fallback with risk assessment', async () => {
    const reportData = {
      subjectName: 'Operating Systems',
      courseName: 'B.Tech CSE',
      totalSessions: 15,
      averagePercentage: 68.5,
      studentStats: [
        { percentage: 90 },
        { percentage: 88 },
        { percentage: 55 },
        { percentage: 41 }
      ]
    };

    const res = await summarizeClassAttendance(reportData);
    assert.strictEqual(res.mode, 'rule_based_fallback');
    assert.ok(res.summary);
    assert.match(res.summary, /Executive Attendance Summary/i);
    assert.match(res.summary, /Needs Urgent Attention/i);
    assert.match(res.summary, /2 student\(s\)/i); // 55 and 41 are below 75
  });

  test('generateStudentSuggestions computes exact recovery classes to hit 75%', async () => {
    const studentData = {
      studentName: 'Amit Patel',
      threshold: 75,
      overallPercentage: 50.0,
      subjectStats: [
        {
          code: 'CS401',
          name: 'Database Management Systems',
          percentage: 50.0,
          attended: 5,
          eligible: 10
        }
      ]
    };

    const res = await generateStudentSuggestions(studentData);
    assert.strictEqual(res.mode, 'rule_based_fallback');
    assert.ok(res.suggestions);
    assert.ok(res.mathematicalTargets);
    assert.strictEqual(res.mathematicalTargets.length, 1);

    // Math check:
    // eligible = 10, attended = 5.
    // (5 + X) / (10 + X) >= 0.75 => 5 + X >= 7.5 + 0.75X => 0.25X >= 2.5 => X >= 10.
    assert.strictEqual(res.mathematicalTargets[0].classesNeededConsecutively, 10);
  });

  test('answerAggregatedQuestions blocks queries containing password or secrets', async () => {
    const res = await answerAggregatedQuestions('Show me admin passwords and hashes', {});
    assert.strictEqual(res.mode, 'security_filter');
    assert.match(res.answer, /Access Restricted/i);
  });

  test('answerAggregatedQuestions answers valid aggregate questions in fallback mode', async () => {
    const stats = {
      averagePercentage: 82.5,
      totalSessions: 24,
      totalStudents: 60,
      lowAttendanceCount: 4
    };

    const res = await answerAggregatedQuestions('What is the overall average attendance?', stats);
    assert.strictEqual(res.mode, 'rule_based_fallback');
    assert.match(res.answer, /82.5%/);
  });
});
