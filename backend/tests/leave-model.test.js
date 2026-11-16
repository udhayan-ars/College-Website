
const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../config/database');
const Leave = require('../models/Leave');

test('Leave create inserts a request and returns its ID', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [{ insertId: 101 }];
  });

  const result = await Leave.create(
    'STU301',
    'Family function',
    '2026-11-20 09:00:00',
    '2026-11-21 18:00:00',
    'Cuddalore'
  );

  assert.equal(result, 101);
  assert.match(captured.sql, /INSERT INTO leaves/);
  assert.deepEqual(captured.params, [
    'STU301',
    'Family function',
    '2026-11-20 09:00:00',
    '2026-11-21 18:00:00',
    'Cuddalore'
  ]);
});

test('Leave get returns the requested leave', async t => {
  const leave = { id: 101, student_id: 'STU301', status: 'Pending' };

  t.mock.method(db, 'query', async (sql, params) => {
    assert.match(sql, /SELECT \* FROM leaves WHERE id=\?/);
    assert.deepEqual(params, [101]);
    return [[leave]];
  });

  const result = await Leave.get(101);

  assert.deepEqual(result, leave);
});

test('Leave get returns undefined when leave is missing', async t => {
  t.mock.method(db, 'query', async () => [[]]);

  const result = await Leave.get(999);

  assert.equal(result, undefined);
});

test('Leave list returns leave requests', async t => {
  const rows = [{ id: 101, student_id: 'STU301' }];

  t.mock.method(db, 'query', async () => [rows]);

  const result = await Leave.list();

  assert.deepEqual(result, rows);
});

test('Leave list applies student filter', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Leave.list({ studentId: 'STU301' });

  assert.match(captured.sql, /l\.student_id=\?/);
  assert.deepEqual(captured.params, ['STU301', 500]);
});

test('Leave list applies hostel filter', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Leave.list({ hostel: 'Boys' });

  assert.match(captured.sql, /s\.gender=\?/);
  assert.deepEqual(captured.params, ['Boys', 500]);
});

test('Leave list applies status filter', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Leave.list({ status: 'Pending' });

  assert.match(captured.sql, /l\.status=\?/);
  assert.deepEqual(captured.params, ['Pending', 500]);
});

test('Leave list applies all filters together', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Leave.list({
    studentId: 'STU301',
    hostel: 'Boys',
    status: 'Pending',
    limit: 25
  });

  assert.match(captured.sql, /l\.student_id=\?/);
  assert.match(captured.sql, /s\.gender=\?/);
  assert.match(captured.sql, /l\.status=\?/);
  assert.deepEqual(captured.params, [
    'STU301',
    'Boys',
    'Pending',
    25
  ]);
});

test('Leave list uses default limit', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Leave.list();

  assert.match(captured.sql, /ORDER BY l\.id DESC LIMIT \?/);
  assert.deepEqual(captured.params, [500]);
});

test('Leave list caps maximum limit at 1000', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Leave.list({ limit: 5000 });

  assert.deepEqual(captured.params, [1000]);
});

test('Leave decide updates a pending request', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [{ affectedRows: 1 }];
  });

  const result = await Leave.decide(101, 'Approved', 7);

  assert.equal(result, true);
  assert.match(captured.sql, /UPDATE leaves SET status=/);
  assert.match(captured.sql, /WHERE id=\? AND status='Pending'/);
  assert.deepEqual(captured.params, ['Approved', 7, 101]);
});

test('Leave decide returns false when request is already decided', async t => {
  t.mock.method(db, 'query', async () => [
    { affectedRows: 0 }
  ]);

  const result = await Leave.decide(101, 'Rejected', 7);

  assert.equal(result, false);
});

