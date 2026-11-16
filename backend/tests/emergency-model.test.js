const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../config/database');
const Emergency = require('../models/Emergency');

test('Emergency create inserts details and returns ID', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [{ insertId: 101 }];
  });

  const result = await Emergency.create(
    5,
    'Medical',
    'Medical assistance required',
    'Hospital',
    '2026-11-17 18:00:00'
  );

  assert.equal(result, 101);
  assert.match(captured.sql, /INSERT INTO emergencies/);
  assert.deepEqual(captured.params, [
    5,
    'Medical',
    'Medical assistance required',
    'Hospital',
    '2026-11-17 18:00:00'
  ]);
});

test('Emergency get returns requested emergency', async (t) => {
  const row = {
    id: 10,
    student_id: 5,
    category: 'Medical',
    status: 'Pending'
  };
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[row]];
  });

  const result = await Emergency.get(10);

  assert.deepEqual(result, row);
  assert.match(captured.sql, /SELECT \* FROM emergencies WHERE id=\?/);
  assert.deepEqual(captured.params, [10]);
});

test('Emergency get returns undefined when missing', async (t) => {
  t.mock.method(db, 'query', async () => [[]]);

  const result = await Emergency.get(999);

  assert.equal(result, undefined);
});

test('Emergency list returns emergency rows', async (t) => {
  const rows = [
    { id: 2, student_id: 5, category: 'Medical' },
    { id: 1, student_id: 6, category: 'Personal' }
  ];
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [rows];
  });

  const result = await Emergency.list();

  assert.deepEqual(result, rows);
  assert.match(captured.sql, /FROM emergencies e JOIN students s/);
  assert.match(captured.sql, /s.is_active=1/);
  assert.match(captured.sql, /ORDER BY e.id DESC LIMIT \?/);
  assert.deepEqual(captured.params, [500]);
});

test('Emergency list applies student filter', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Emergency.list({ studentId: 5 });

  assert.match(captured.sql, /e.student_id=\?/);
  assert.deepEqual(captured.params, [5, 500]);
});

test('Emergency list applies hostel filter', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Emergency.list({ hostel: 'Boys' });

  assert.match(captured.sql, /s.gender=\?/);
  assert.deepEqual(captured.params, ['Boys', 500]);
});

test('Emergency list applies status filter', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Emergency.list({ status: 'Pending' });

  assert.match(captured.sql, /e.status=\?/);
  assert.deepEqual(captured.params, ['Pending', 500]);
});

test('Emergency list applies all filters together', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Emergency.list({
    studentId: 5,
    hostel: 'Boys',
    status: 'Pending',
    limit: 25
  });

  assert.match(captured.sql, /e.student_id=\?/);
  assert.match(captured.sql, /s.gender=\?/);
  assert.match(captured.sql, /e.status=\?/);
  assert.deepEqual(captured.params, [5, 'Boys', 'Pending', 25]);
});

test('Emergency list uses default limit when missing', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = params;
    return [[]];
  });

  await Emergency.list({ studentId: 5 });

  assert.equal(captured.at(-1), 500);
});

test('Emergency list caps maximum limit at 1000', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = params;
    return [[]];
  });

  await Emergency.list({ limit: 5000 });

  assert.equal(captured.at(-1), 1000);
});

test('Emergency list uses default limit for invalid limit', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = params;
    return [[]];
  });

  await Emergency.list({ limit: 'invalid' });

  assert.equal(captured.at(-1), 500);
});

test('Emergency setStatus updates emergency status', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [{ affectedRows: 1 }];
  });

  const result = await Emergency.setStatus(10, 'Approved');

  assert.match(
    captured.sql,
    /UPDATE emergencies SET status=\? WHERE id=\?/
  );
  assert.deepEqual(captured.params, ['Approved', 10]);
  assert.deepEqual(result, [{ affectedRows: 1 }]);
});
