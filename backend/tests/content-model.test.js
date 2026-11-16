const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../config/database');
const Content = require('../models/Content');

test('MEALS contains all four meal names', () => {
  assert.deepEqual(Content.MEALS, [
    'Breakfast',
    'Lunch',
    'Snacks',
    'Dinner'
  ]);
});

test('audit inserts audit log details', async (t) => {
  let captured;
  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [{ affectedRows: 1 }];
  });

  await Content.audit(10, 'CREATE', 'Test details');

  assert.match(captured.sql, /INSERT INTO audit_logs/);
  assert.deepEqual(captured.params, [10, 'CREATE', 'Test details']);
});

test('audit uses null for missing user and details', async (t) => {
  let captured;
  t.mock.method(db, 'query', async (sql, params) => {
    captured = params;
    return [{ affectedRows: 1 }];
  });

  await Content.audit(null, 'VIEW', '');

  assert.deepEqual(captured, [null, 'VIEW', null]);
});

test('audit truncates details to 500 characters', async (t) => {
  let captured;
  t.mock.method(db, 'query', async (sql, params) => {
    captured = params;
    return [{ affectedRows: 1 }];
  });

  await Content.audit(5, 'UPDATE', 'A'.repeat(600));

  assert.equal(captured[2].length, 500);
});

test('audit handles database errors without throwing', async (t) => {
  t.mock.method(db, 'query', async () => {
    throw new Error('Database unavailable');
  });

  let logged;
  t.mock.method(console, 'error', (...args) => {
    logged = args;
  });

  await assert.doesNotReject(Content.audit(1, 'TEST', 'details'));
  assert.equal(logged[0], 'Audit log failed:');
  assert.equal(logged[1], 'Database unavailable');
});

test('notices returns all notices with default limit', async (t) => {
  const rows = [{ id: 1, hostel: 'All', message: 'Notice' }];
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [rows];
  });

  const result = await Content.notices(null);

  assert.deepEqual(result, rows);
  assert.match(captured.sql, /FROM notices/);
  assert.deepEqual(captured.params, [100]);
});

test('notices filters All and selected hostel', async (t) => {
  const rows = [{ id: 2, hostel: 'Boys', message: 'Update' }];
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [rows];
  });

  const result = await Content.notices('Boys', 25);

  assert.deepEqual(result, rows);
  assert.match(captured.sql, /hostel IN \('All',\?\)/);
  assert.deepEqual(captured.params, ['Boys', 25]);
});

test('notices accepts custom limit without hostel filter', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Content.notices(null, 20);

  assert.deepEqual(captured.params, [20]);
});

test('addNotice inserts notice and returns insert ID', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [{ insertId: 101 }];
  });

  const result = await Content.addNotice('Boys', 'Water supply update', 7);

  assert.equal(result, 101);
  assert.match(captured.sql, /INSERT INTO notices/);
  assert.deepEqual(captured.params, [
    'Boys',
    'Water supply update',
    7
  ]);
});

test('menu returns mess menu rows', async (t) => {
  const rows = [{ meal: 'Breakfast', items: 'Idly' }];

  t.mock.method(db, 'query', async () => [rows]);

  assert.deepEqual(await Content.menu(), rows);
});

test('updateMeal updates items and serving time', async (t) => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [{ affectedRows: 1 }];
  });

  const result = await Content.updateMeal(
    'Lunch',
    'Rice and curry',
    '12:30 PM'
  );

  assert.match(captured.sql, /UPDATE mess_menu/);
  assert.match(captured.sql, /COALESCE/);
  assert.deepEqual(captured.params, [
    'Rice and curry',
    '12:30 PM',
    'Lunch'
  ]);
  assert.deepEqual(result, [{ affectedRows: 1 }]);
});

test('rules returns rules in sorted order', async (t) => {
  const rows = [
    { id: 1, rule_text: 'Maintain silence' },
    { id: 2, rule_text: 'Keep rooms clean' }
  ];
  let capturedSql;

  t.mock.method(db, 'query', async (sql) => {
    capturedSql = sql;
    return [rows];
  });

  assert.deepEqual(await Content.rules(), rows);
  assert.match(capturedSql, /ORDER BY sort_order,id/);
});
