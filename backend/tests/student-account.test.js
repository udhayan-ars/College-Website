const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

const db = require('../config/database');
const Student = require('../models/Student');
const User = require('../models/User');
const controller = require('../controllers/studentController');

function runController(action, user, id, body = {}) {
  return new Promise(resolve => {
    const req = { user, params: { id }, body };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, response: data });
      }
    };

    controller[action](req, res, error => resolve({ error }));
  });
}

const admin = { id: 1, role: 'admin' };

const activeStudent = () => ({
  id: 'STU301',
  name: 'Test Student',
  gender: 'Boys',
  is_active: 1
});

test('Student account details are returned successfully', async t => {
  t.mock.method(Student, 'get', async () => activeStudent());

  t.mock.method(db, 'query', async () => [[{
    username: 'stu301',
    is_active: 1,
    student_id: 'STU301'
  }]]);

  const { response } = await runController('getAccount', admin, 'stu301');

  assert.equal(response.account.username, 'stu301');
  assert.equal(response.account.active, true);
  assert.equal(response.account.studentId, 'STU301');
});

test('Student account lookup returns 404 when account is missing', async t => {
  t.mock.method(Student, 'get', async () => activeStudent());
  t.mock.method(db, 'query', async () => [[]]);

  const { error } = await runController('getAccount', admin, 'STU301');

  assert.equal(error.status, 404);
});

test('Student password reset succeeds with valid password', async t => {
  let updatedId;
  let updatedFields;

  t.mock.method(Student, 'get', async () => activeStudent());

  t.mock.method(db, 'query', async () => [[{
    id: 25,
    is_active: 1
  }]]);

  t.mock.method(bcrypt, 'hash', async () => 'mock-password-hash');

  t.mock.method(User, 'update', async (id, fields) => {
    updatedId = id;
    updatedFields = fields;
  });

  const { response } = await runController(
    'resetStudentPassword',
    admin,
    'stu301',
    { newPassword: 'TestPass123' }
  );

  assert.equal(updatedId, 25);
  assert.equal(updatedFields.password_hash, 'mock-password-hash');
  assert.match(response.message, /password reset successfully/i);
});

test('Student password reset rejects an invalid password', async t => {
  t.mock.method(Student, 'get', async () => activeStudent());

  const { error } = await runController(
    'resetStudentPassword',
    admin,
    'STU301',
    { newPassword: 'short' }
  );

  assert.equal(error.status, 400);
});

test('Student password reset rejects a missing account', async t => {
  t.mock.method(Student, 'get', async () => activeStudent());
  t.mock.method(db, 'query', async () => [[]]);

  const { error } = await runController(
    'resetStudentPassword',
    admin,
    'STU301',
    { newPassword: 'TestPass123' }
  );

  assert.equal(error.status, 404);
});

test('Student password reset rejects an inactive account', async t => {
  t.mock.method(Student, 'get', async () => activeStudent());

  t.mock.method(db, 'query', async () => [[{
    id: 25,
    is_active: 0
  }]]);

  const { error } = await runController(
    'resetStudentPassword',
    admin,
    'STU301',
    { newPassword: 'TestPass123' }
  );

  assert.equal(error.status, 404);
});
