const { test, describe } = require('node:test');
const assert = require('node:assert');
const { validateLogin, validateCreateUser } = require('../src/validators/userValidators');
const {
  validateCreateSession,
  validateMarkAttendance,
  validateUpdateRecord
} = require('../src/validators/attendanceValidators');

function mockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

describe('Input Validation Middleware Tests', () => {
  test('validateLogin rejects invalid email', () => {
    const req = { body: { email: 'invalid-email-format', password: 'Pass' } };
    const res = mockResponse();
    let nextCalled = false;
    validateLogin(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.message, /valid email/i);
  });

  test('validateLogin accepts valid credentials payload', () => {
    const req = { body: { email: 'admin@college.edu', password: 'Password@123' } };
    const res = mockResponse();
    let nextCalled = false;
    validateLogin(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
  });

  test('validateCreateUser rejects short password (< 6 chars)', () => {
    const req = {
      body: {
        email: 'prof@college.edu',
        password: '123',
        role: 'faculty',
        firstName: 'John',
        lastName: 'Doe'
      }
    };
    const res = mockResponse();
    let nextCalled = false;
    validateCreateUser(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.message, /at least 6 characters/i);
  });

  test('validateCreateSession rejects malformed session date', () => {
    const req = {
      body: {
        subjectId: 1,
        sessionDate: '2026/03/15', // Bad format, requires YYYY-MM-DD
        startTime: '09:00',
        endTime: '10:00'
      }
    };
    const res = mockResponse();
    let nextCalled = false;
    validateCreateSession(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.message, /YYYY-MM-DD/i);
  });

  test('validateMarkAttendance rejects empty records array', () => {
    const req = { body: { records: [] } };
    const res = mockResponse();
    let nextCalled = false;
    validateMarkAttendance(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.message, /at least one student/i);
  });

  test('validateMarkAttendance rejects invalid status value', () => {
    const req = {
      body: {
        records: [{ studentId: 1, status: 'excused' }] // Only 'present', 'absent', 'late' are valid
      }
    };
    const res = mockResponse();
    let nextCalled = false;
    validateMarkAttendance(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.message, /Allowed: present, absent, late/i);
  });

  test('validateUpdateRecord accepts valid status', () => {
    const req = { body: { status: 'late' } };
    const res = mockResponse();
    let nextCalled = false;
    validateUpdateRecord(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
  });
});
