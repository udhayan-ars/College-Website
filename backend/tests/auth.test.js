const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { authenticate, authorize } = require('../middleware/auth');
const User = require('../models/User');

process.env.JWT_SECRET = 'test-only-secret-key-for-auth-tests-123456';

function runMiddleware(middleware, req) {
  return new Promise(resolve => {
    const res = {};
    const next = err => resolve(err || null);
    middleware(req, res, next);
  });
}

test('Authentication rejects requests without a token', async () => {
  const error = await runMiddleware(authenticate, { cookies: {} });

  assert.equal(error.status, 401);
  assert.equal(error.message, 'Authentication required.');
});

test('Authentication rejects invalid JWT tokens', async () => {
  const error = await runMiddleware(authenticate, {
    cookies: { token: 'invalid.test.token' }
  });

  assert.equal(error.status, 401);
  assert.equal(error.message, 'Session expired. Please log in again.');
});

test('Authorization rejects users with the wrong role', async () => {
  const error = await runMiddleware(authorize('admin'), {
    user: { role: 'student' }
  });

  assert.equal(error.status, 403);
});

test('Authorization allows users with the required role', async () => {
  const error = await runMiddleware(authorize('admin'), {
    user: { role: 'admin' }
  });

  assert.equal(error, null);
});

test('Authentication allows a valid token for an active user', async t => {
  const user = {
    id: 101,
    username: 'testuser',
    role: 'student',
    is_active: 1
  };

  t.mock.method(User, 'findById', async () => user);

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    algorithm: 'HS256'
  });

  const req = { cookies: { token } };
  const error = await runMiddleware(authenticate, req);

  assert.equal(error, null);
  assert.equal(req.user, user);
});

test('Authentication rejects a valid token for an inactive user', async t => {
  const user = {
    id: 102,
    username: 'inactiveuser',
    role: 'student',
    is_active: 0
  };

  t.mock.method(User, 'findById', async () => user);

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    algorithm: 'HS256'
  });

  const error = await runMiddleware(authenticate, {
    cookies: { token }
  });

  assert.equal(error.status, 401);
  assert.equal(error.message, 'Account is not active.');
});
