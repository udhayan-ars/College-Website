const test = require('node:test');
const assert = require('node:assert/strict');

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const db = require('../config/database');
const authController = require('../controllers/authController');

process.env.JWT_SECRET = 'test-only-secret-key-for-login-tests-123456';
process.env.NODE_ENV = 'test';

function runLogin(body) {
  return new Promise(resolve => {
    const req = { body };
    const res = {
      cookieName: null,
      cookieValue: null,
      cookieOptions: null,
      response: null,
      cookie(name, value, options) {
        this.cookieName = name;
        this.cookieValue = value;
        this.cookieOptions = options;
      },
      json(data) {
        this.response = data;
        resolve({ response: data, res });
      }
    };

    const next = error => resolve({ error });

    authController.login(req, res, next);
  });
}

test('Login succeeds with correct credentials', async t => {
  const passwordHash = await bcrypt.hash('TestPass123', 4);

  const user = {
    id: 201,
    username: 'testuser',
    password_hash: passwordHash,
    role: 'student',
    full_name: 'Test User',
    hostel: 'Boys',
    student_id: 'TEST201',
    is_active: 1
  };

  t.mock.method(User, 'findByUsername', async () => user);
  t.mock.method(db, 'query', async () => []);

  const { response, res } = await runLogin({
    username: 'testuser',
    password: 'TestPass123'
  });

  assert.equal(response.message, 'Login successful.');
  assert.equal(response.user.username, 'testuser');
  assert.equal(res.cookieName, 'token');
  assert.equal(res.cookieOptions.httpOnly, true);
  assert.equal(res.cookieOptions.sameSite, 'strict');
});

test('Login rejects an incorrect password', async t => {
  const passwordHash = await bcrypt.hash('Correct123', 4);

  t.mock.method(User, 'findByUsername', async () => ({
    id: 202,
    username: 'testuser',
    password_hash: passwordHash,
    is_active: 1
  }));

  const { error } = await runLogin({
    username: 'testuser',
    password: 'Wrong123'
  });

  assert.equal(error.status, 401);
});

test('Login rejects an unknown username', async t => {
  t.mock.method(User, 'findByUsername', async () => undefined);

  const { error } = await runLogin({
    username: 'unknownuser',
    password: 'TestPass123'
  });

  assert.equal(error.status, 401);
});

test('Login rejects an inactive account', async t => {
  const passwordHash = await bcrypt.hash('TestPass123', 4);

  t.mock.method(User, 'findByUsername', async () => ({
    id: 203,
    username: 'inactiveuser',
    password_hash: passwordHash,
    is_active: 0
  }));

  const { error } = await runLogin({
    username: 'inactiveuser',
    password: 'TestPass123'
  });

  assert.equal(error.status, 401);
});
