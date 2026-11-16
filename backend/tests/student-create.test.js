const test = require('node:test');
const assert = require('node:assert/strict');

const bcrypt = require('bcryptjs');
const db = require('../config/database');
const Student = require('../models/Student');
const User = require('../models/User');
const controller = require('../controllers/studentController');

function runCreate(user, body) {
  return new Promise(resolve => {
    const req = { user, body };
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

    controller.create(req, res, error => resolve({ error }));
  });
}

const admin = { id: 1, role: 'admin' };

const validStudent = () => ({
  id: 'stu301',
  name: 'Test Student',
  gender: 'Boys',
  dept: 'CSE',
  year: '2nd',
  phone: '9876543210',
  email: 'student@example.com',
  parent: 'Test Parent',
  emergencyContact: '9876543211',
  password: 'Student123'
});

test('Student creation succeeds with valid data', async t => {
  let createdStudent;
  let createdUser;

  t.mock.method(db, 'withTx', async fn => fn({
    query: async () => [[]]
  }));

  t.mock.method(Student, 'create', async (conn, student) => {
    createdStudent = student;
  });

  t.mock.method(User, 'create', async user => {
    createdUser = user;
  });

  t.mock.method(Student, 'get', async id => ({ id, name: 'Test Student' }));
  t.mock.method(db, 'query', async () => []);
  t.mock.method(bcrypt, 'hash', async () => 'test-hash');

  const { status, response } = await runCreate(admin, validStudent());

  assert.equal(status, 201);
  assert.equal(response.message, 'Student created.');
  assert.equal(createdStudent.id, 'STU301');
  assert.equal(createdUser.username, 'STU301');
  assert.equal(createdUser.hash, 'test-hash');
});

test('Student creation rejects an invalid student ID', async () => {
  const body = validStudent();
  body.id = 'invalid id';

  const { error } = await runCreate(admin, body);

  assert.equal(error.status, 400);
});

test('Student creation rejects an invalid email', async () => {
  const body = validStudent();
  body.email = 'invalid-email';

  const { error } = await runCreate(admin, body);

  assert.equal(error.status, 400);
});

test('Warden cannot create a student in another hostel', async () => {
  const { error } = await runCreate({
    id: 2,
    role: 'warden',
    hostel: 'Girls'
  }, validStudent());

  assert.equal(error.status, 403);
});

test('Student creation rejects an invalid password', async () => {
  const body = validStudent();
  body.password = 'short';

  const { error } = await runCreate(admin, body);

  assert.equal(error.status, 400);
});
