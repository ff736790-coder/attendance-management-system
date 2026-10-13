const { test, describe } = require('node:test');
const assert = require('node:assert');
const { calculateAttendanceMetrics } = require('../src/services/attendanceService');

describe('Attendance Percentage Calculation & Threshold Tests', () => {
  test('Standard calculation: 8 present, 2 late, 2 absent with 0.5 late weight', () => {
    // Eligible = 8 + 2 + 2 = 12
    // Attended = 8 + (2 * 0.5) = 9
    // Expected % = (9 / 12) * 100 = 75.0%
    const metrics = calculateAttendanceMetrics(8, 2, 2, 0.5);
    assert.strictEqual(metrics.eligible, 12);
    assert.strictEqual(metrics.attended, 9.0);
    assert.strictEqual(metrics.present, 8);
    assert.strictEqual(metrics.late, 2);
    assert.strictEqual(metrics.absent, 2);
    assert.strictEqual(metrics.percentage, 75.0);
  });

  test('Calculation with 1.0 late weight (late counted as full present)', () => {
    // Eligible = 8 + 2 + 2 = 12
    // Attended = 8 + (2 * 1.0) = 10
    // Expected % = (10 / 12) * 100 = 83.33%
    const metrics = calculateAttendanceMetrics(8, 2, 2, 1.0);
    assert.strictEqual(metrics.eligible, 12);
    assert.strictEqual(metrics.attended, 10.0);
    assert.strictEqual(metrics.percentage, 83.33);
  });

  test('Calculation with 0.0 late weight (late counted as absent)', () => {
    // Eligible = 8 + 2 + 2 = 12
    // Attended = 8 + 0 = 8
    // Expected % = (8 / 12) * 100 = 66.67%
    const metrics = calculateAttendanceMetrics(8, 2, 2, 0.0);
    assert.strictEqual(metrics.eligible, 12);
    assert.strictEqual(metrics.attended, 8.0);
    assert.strictEqual(metrics.percentage, 66.67);
  });

  test('Division by zero protection: 0 sessions eligible returns 0%', () => {
    const metrics = calculateAttendanceMetrics(0, 0, 0, 0.5);
    assert.strictEqual(metrics.eligible, 0);
    assert.strictEqual(metrics.attended, 0);
    assert.strictEqual(metrics.percentage, 0);
  });

  test('Perfect attendance: 10 present, 0 late, 0 absent returns 100%', () => {
    const metrics = calculateAttendanceMetrics(10, 0, 0, 0.5);
    assert.strictEqual(metrics.eligible, 10);
    assert.strictEqual(metrics.attended, 10);
    assert.strictEqual(metrics.percentage, 100);
  });

  test('Low attendance trigger: 4 present, 0 late, 6 absent returns 40% (below 75%)', () => {
    const metrics = calculateAttendanceMetrics(4, 0, 6, 0.5);
    assert.strictEqual(metrics.percentage, 40);
    assert.strictEqual(metrics.percentage < 75, true);
  });
});
