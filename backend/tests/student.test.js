const test = require('node:test');
const assert = require('node:assert/strict');

const Student = require('../models/Student');
const studentController = require('../controllers/studentController');

function runList(user, query = {}) {
  return new Promise(resolve => {
    const req = { user, query };
    const res = {
      data: null,
      json(data) {
        this.data = data;
        resolve({ response: data });
      }
    };

    const next = error => resolve({ error });

    studentController.list(req, res, next);
  });
}

test('Student list returns rows and total count', async t => {
  const rows = [{ id: 'STU101', name: 'Test Student' }];

  t.mock.method(Student, 'list', async () => ({
    rows,
    total: 1
  }));

  const { response } = await runList({
    role: 'admin'
  });

  assert.equal(response.total, 1);
  assert.deepEqual(response.students, rows);
});

test('Warden is restricted to their own hostel', async t => {
  let filters;

  t.mock.method(Student, 'list', async f => {
    filters = f;
    return { rows: [], total: 0 };
  });

  await runList({
    role: 'warden',
    hostel: 'Boys'
  });

  assert.equal(filters.hostel, 'Boys');
});

test('Admin can filter students by hostel', async t => {
  let filters;

  t.mock.method(Student, 'list', async f => {
    filters = f;
    return { rows: [], total: 0 };
  });

  await runList({
    role: 'admin'
  }, {
    hostel: 'Girls'
  });

  assert.equal(filters.hostel, 'Girls');
});

test('Invalid student status is rejected', async () => {
  const { error } = await runList({
    role: 'admin'
  }, {
    status: 'Unknown'
  });

  assert.equal(error.status, 400);
});

test('Admin cannot use an invalid hostel filter', async () => {
  const { error } = await runList({
    role: 'admin'
  }, {
    hostel: 'Unknown'
  });

  assert.equal(error.status, 400);
});
