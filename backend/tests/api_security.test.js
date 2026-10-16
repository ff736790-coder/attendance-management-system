const { test, describe } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const { signToken, verifyToken } = require('../src/config/jwt');
const { errorHandler } = require('../src/middleware/errorHandler');

describe('API Security & RBAC Integration Tests', () => {
  test('Health check endpoint is publicly accessible', async () => {
    const res = await request(app).get('/api/system/health');
    assert.ok([200, 503].includes(res.status));
    assert.ok(res.body.timestamp);
    assert.ok(res.body.environment);
  });

  test('Protected endpoint returns 401 Unauthorized when no token is supplied', async () => {
    const res = await request(app).get('/api/attendance/sessions');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /token required/i);
  });

  test('Protected endpoint returns 401 Unauthorized for invalid token signature', async () => {
    const res = await request(app)
      .get('/api/attendance/sessions')
      .set('Authorization', 'Bearer invalid.bogus.jwt');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  test('RBAC Middleware blocks Student role from accessing Admin-only user creation (403 Forbidden)', async () => {
    // Generate valid JWT for a student
    const studentToken = signToken({
      id: 99,
      email: 'student@college.edu',
      role: 'student',
      firstName: 'Student',
      lastName: 'Test',
      studentId: 99
    });

    const res = await request(app)
      .post('/api/users/users')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        email: 'test@college.edu',
        password: 'Password@123',
        role: 'admin',
        firstName: 'Test',
        lastName: 'Admin'
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Forbidden: Access denied/i);
  });

  test('RBAC Middleware blocks Student role from accessing faculty report endpoints (403 Forbidden)', async () => {
    const studentToken = signToken({
      id: 99,
      email: 'student@college.edu',
      role: 'student',
      firstName: 'Student',
      lastName: 'Test',
      studentId: 99
    });

    const res = await request(app)
      .get('/api/reports/class/1')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 403);
  });

  test('JWT sign and verify works symmetrically with expected payload claims', () => {
    const payload = { id: 42, email: 'faculty@college.edu', role: 'faculty' };
    const token = signToken(payload);
    assert.ok(token);

    const decoded = verifyToken(token);
    assert.strictEqual(decoded.id, 42);
    assert.strictEqual(decoded.email, 'faculty@college.edu');
    assert.strictEqual(decoded.role, 'faculty');
  });

  test('Duplicate Key Database Error (ER_DUP_ENTRY) translates to HTTP 409 Conflict', () => {
    const err = new Error('Duplicate entry for key uq_session_student');
    err.code = 'ER_DUP_ENTRY';

    const req = { originalUrl: '/api/attendance/sessions/1/records', method: 'POST' };
    let statusSet = 200;
    let jsonBody = null;
    const res = {
      status(code) { statusSet = code; return this; },
      json(data) { jsonBody = data; return this; }
    };

    errorHandler(err, req, res, () => {});
    assert.strictEqual(statusSet, 409);
    assert.strictEqual(jsonBody.success, false);
    assert.match(jsonBody.message, /Duplicate record conflict/i);
  });
});
