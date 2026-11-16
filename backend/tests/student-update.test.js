const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../config/database');
const Student = require('../models/Student');
const User = require('../models/User');
const controller = require('../controllers/studentController');

function runUpdate(user, id, body) {
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

    controller.update(req, res, error => resolve({ error }));
  });
}

const admin = { id: 1, role: 'admin' };

const activeStudent = () => ({
  id: 'STU301',
  name: 'Test Student',
  gender: 'Boys',
  is_active: 1
});

test('Student update succeeds with valid data', async t => {
  let updatedFields;
  let updatedId;
  let userQuery;

  t.mock.method(Student, 'get', async () => activeStudent());

  t.mock.method(db, 'withTx', async fn => fn({
    query: async (...args) => {
      userQuery = args;
      return [];
    }
  }));

  t.mock.method(Student, 'update', async (id, fields) => {
    updatedId = id;
    updatedFields = fields;
  });

  t.mock.method(db, 'query', async () => []);

  const { response } = await runUpdate(admin, 'stu301', {
    name: 'Updated Student',
    dept: 'ECE',
    year: '3rd'
  });

  assert.equal(response.message, 'Student updated.');
  assert.equal(updatedId, 'STU301');
  assert.equal(updatedFields.name, 'Updated Student');
  assert.equal(updatedFields.dept, 'ECE');
  assert.equal(updatedFields.year_of_study, '3rd');
  assert.equal(userQuery[0], 'UPDATE users SET full_name=? WHERE student_id=?');
});

test('Student update rejects an empty request', async t => {
  t.mock.method(Student, 'get', async () => activeStudent());

  const { error } = await runUpdate(admin, 'STU301', {});

  assert.equal(error.status, 400);
});

test('Student update rejects an invalid email', async t => {
  t.mock.method(Student, 'get', async () => activeStudent());

  const { error } = await runUpdate(admin, 'STU301', {
    email: 'invalid-email'
  });

  assert.equal(error.status, 400);
});

test('Student update rejects an invalid year', async t => {
  t.mock.method(Student, 'get', async () => activeStudent());

  const { error } = await runUpdate(admin, 'STU301', {
    year: '5th'
  });

  assert.equal(error.status, 400);
});

test('Warden cannot update a student in another hostel', async t => {
  t.mock.method(Student, 'get', async () => activeStudent());

  const { error } = await runUpdate({
    id: 2,
    role: 'warden',
    hostel: 'Girls'
  }, 'STU301', {
    name: 'Updated Student'
  });

  assert.equal(error.status, 403);
});

test('Student cannot update another student record', async t => {
  t.mock.method(Student, 'get', async () => activeStudent());

  const { error } = await runUpdate({
    id: 3,
    role: 'student',
    student_id: 'STU999'
  }, 'STU301', {
    name: 'Updated Student'
  });

  assert.equal(error.status, 403);
});
