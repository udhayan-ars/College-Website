const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../config/database');
const Complaint = require('../models/Complaint');

test('Complaint create inserts details and returns ID', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [{ insertId: 101 }];
  });

  const result = await Complaint.create(5, 'Maintenance', 'Water leakage');

  assert.equal(result, 101);
  assert.match(captured.sql, /INSERT INTO complaints/);
  assert.deepEqual(captured.params, [
    5,
    'Maintenance',
    'Water leakage'
  ]);
});

test('Complaint get returns requested complaint', async (t) => {
  const row = {
    id: 10,
    student_id: 5,
    category: 'Maintenance',
    status: 'Pending'
  };
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[row]];
  });

  const result = await Complaint.get(10);

  assert.deepEqual(result, row);
  assert.match(captured.sql, /SELECT \* FROM complaints WHERE id=\?/);
  assert.deepEqual(captured.params, [10]);
});

test('Complaint get returns undefined when complaint is missing', async (t) => {
  t.mock.method(db, 'query', async () => [[]]);

  const result = await Complaint.get(999);

  assert.equal(result, undefined);
});

test('Complaint list returns complaint rows', async (t) => {
  const rows = [
    { id: 2, student_id: 5, category: 'Maintenance' },
    { id: 1, student_id: 6, category: 'Food' }
  ];
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [rows];
  });

  const result = await Complaint.list();

  assert.deepEqual(result, rows);
  assert.match(captured.sql, /FROM complaints c JOIN students s/);
  assert.match(captured.sql, /s.is_active=1/);
  assert.match(captured.sql, /ORDER BY c.id DESC LIMIT \?/);
  assert.deepEqual(captured.params, [500]);
});

test('Complaint list applies student filter', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Complaint.list({ studentId: 5 });

  assert.match(captured.sql, /c.student_id=\?/);
  assert.deepEqual(captured.params, [5, 500]);
});

test('Complaint list applies hostel filter', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Complaint.list({ hostel: 'Boys' });

  assert.match(captured.sql, /s.gender=\?/);
  assert.deepEqual(captured.params, ['Boys', 500]);
});

test('Complaint list applies status filter', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Complaint.list({ status: 'Pending' });

  assert.match(captured.sql, /c.status=\?/);
  assert.deepEqual(captured.params, ['Pending', 500]);
});

test('Complaint list applies all filters together', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Complaint.list({
    studentId: 5,
    hostel: 'Boys',
    status: 'Pending',
    limit: 25
  });

  assert.match(captured.sql, /c.student_id=\?/);
  assert.match(captured.sql, /s.gender=\?/);
  assert.match(captured.sql, /c.status=\?/);
  assert.deepEqual(captured.params, [5, 'Boys', 'Pending', 25]);
});

test('Complaint list uses default limit when limit is missing', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = params;
    return [[]];
  });

  await Complaint.list({ studentId: 5 });

  assert.equal(captured.at(-1), 500);
});

test('Complaint list caps maximum limit at 1000', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = params;
    return [[]];
  });

  await Complaint.list({ limit: 5000 });

  assert.equal(captured.at(-1), 1000);
});

test('Complaint list uses default limit for invalid limit', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = params;
    return [[]];
  });

  await Complaint.list({ limit: 'invalid' });

  assert.equal(captured.at(-1), 500);
});

test('Complaint setStatus updates complaint status', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [{ affectedRows: 1 }];
  });

  const result = await Complaint.setStatus(10, 'Resolved');

  assert.match(captured.sql, /UPDATE complaints SET status=\? WHERE id=\?/);
  assert.deepEqual(captured.params, ['Resolved', 10]);
  assert.deepEqual(result, [{ affectedRows: 1 }]);
});
