const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../config/database');
const Student = require('../models/Student');
const controller = require('../controllers/studentController');

function runRemove(user, id, query = {}) {
  return new Promise(resolve => {
    const req = { user, params: { id }, query };
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

    controller.remove(req, res, error => resolve({ error }));
  });
}

const admin = { id: 1, role: 'admin' };

const activeStudent = () => ({
  id: 'STU301',
  name: 'Test Student',
  gender: 'Boys',
  is_active: 1
});

test('Student archive succeeds by default', async t => {
  let archivedId;

  t.mock.method(Student, 'get', async () => activeStudent());

  t.mock.method(db, 'withTx', async fn => fn({}));

  t.mock.method(Student, 'archive', async (conn, id) => {
    archivedId = id;
  });

  t.mock.method(db, 'query', async () => []);

  const { response } = await runRemove(admin, 'stu301');

  assert.equal(response.message, 'Student archived and room released.');
  assert.equal(archivedId, 'STU301');
});

test('Admin can permanently delete a student', async t => {
  let deletedId;

  t.mock.method(Student, 'get', async () => activeStudent());

  t.mock.method(Student, 'hardDelete', async id => {
    deletedId = id;
  });

  t.mock.method(db, 'query', async () => []);

  const { response } = await runRemove(admin, 'stu301', {
    permanent: 'true'
  });

  assert.equal(response.message, 'Student permanently deleted.');
  assert.equal(deletedId, 'STU301');
});

test('Warden cannot permanently delete a student', async t => {
  t.mock.method(Student, 'get', async () => activeStudent());

  const { error } = await runRemove({
    id: 2,
    role: 'warden',
    hostel: 'Boys'
  }, 'STU301', {
    permanent: 'true'
  });

  assert.equal(error.status, 403);
});

test('Student cannot archive another hostel student', async t => {
  t.mock.method(Student, 'get', async () => activeStudent());

  const { error } = await runRemove({
    id: 2,
    role: 'warden',
    hostel: 'Girls'
  }, 'STU301');

  assert.equal(error.status, 403);
});

test('Cannot archive a student who does not exist', async t => {
  t.mock.method(Student, 'get', async () => null);

  const { error } = await runRemove(admin, 'STU999');

  assert.equal(error.status, 404);
});
