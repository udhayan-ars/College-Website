const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../config/database');
const Student = require('../models/Student');

test('Student list applies all filters and search', async t => {
  let calls = [];
  t.mock.method(db, 'query', async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('COUNT(*)')) return [[{ total: 1 }]];
    return [[{ id: 'STU101', name: 'Test Student' }]];
  });

  const result = await Student.list({
    hostel: 'Boys',
    dept: 'CSE',
    year: 2,
    status: 'Active',
    roomNo: 'A101',
    search: 'Test',
    limit: 20,
    offset: 5
  });

  assert.equal(result.total, 1);
  assert.equal(result.rows[0].id, 'STU101');
  assert.match(calls[0].sql, /s\.gender=\?/);
  assert.match(calls[0].sql, /s\.dept=\?/);
  assert.match(calls[0].sql, /s\.year_of_study=\?/);
  assert.match(calls[0].sql, /s\.status=\?/);
  assert.match(calls[0].sql, /r\.room_no=\?/);
  assert.match(calls[0].sql, /s\.name LIKE \?/);
  assert.deepEqual(calls[0].params, [
    'Boys', 'CSE', 2, 'Active', 'A101',
    '%Test%', '%Test%', '%Test%', 20, 5
  ]);
  assert.deepEqual(calls[1].params, [
    'Boys', 'CSE', 2, 'Active', 'A101',
    '%Test%', '%Test%', '%Test%'
  ]);
});

test('Student list defaults to active students and default pagination', async t => {
  let captured;
  t.mock.method(db, 'query', async (sql, params) => {
    if (!sql.includes('COUNT(*)')) captured = { sql, params };
    if (sql.includes('COUNT(*)')) return [[{ total: 0 }]];
    return [[]];
  });

  const result = await Student.list();

  assert.deepEqual(result, { rows: [], total: 0 });
  assert.match(captured.sql, /s\.is_active=1/);
  assert.deepEqual(captured.params, [200, 0]);
});

test('Student list filters archived students', async t => {
  let captured;
  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    if (sql.includes('COUNT(*)')) return [[{ total: 1 }]];
    return [[{ id: 'STU101', is_active: 0 }]];
  });

  const result = await Student.list({ archived: true });

  assert.equal(result.total, 1);
  assert.match(captured.sql, /s\.is_active=0/);
});

test('Student list caps maximum limit and prevents negative offset', async t => {
  let captured;
  t.mock.method(db, 'query', async (sql, params) => {
    if (!sql.includes('COUNT(*)')) captured = { sql, params };
    if (sql.includes('COUNT(*)')) return [[{ total: 0 }]];
    return [[]];
  });

  await Student.list({ limit: 1000, offset: -10 });

  assert.deepEqual(captured.params, [500, 0]);
});

test('Student get returns the requested student', async t => {
  const student = { id: 'STU101', name: 'Test Student' };
  t.mock.method(db, 'query', async (sql, params) => {
    assert.match(sql, /WHERE s\.id=\?/);
    assert.deepEqual(params, ['STU101']);
    return [[student]];
  });

  assert.deepEqual(await Student.get('STU101'), student);
});

test('Student get returns undefined when student is missing', async t => {
  t.mock.method(db, 'query', async () => [[]]);

  assert.equal(await Student.get('STU999'), undefined);
});

test('Student create inserts student details using supplied connection', async () => {
  let captured;
  const connection = {
    query: async (sql, params) => {
      captured = { sql, params };
      return [{ insertId: 1 }];
    }
  };

  await Student.create(connection, {
    id: 'STU101',
    name: 'Test Student',
    gender: 'Boys',
    dept: 'CSE',
    year: 2,
    phone: '9876543210',
    email: 'student@example.com',
    parent: 'Parent',
    emergencyContact: '9876500000'
  });

  assert.match(captured.sql, /INSERT INTO students/);
  assert.match(captured.sql, /CURDATE\(\)/);
  assert.deepEqual(captured.params, [
    'STU101', 'Test Student', 'Boys', 'CSE', 2,
    '9876543210', 'student@example.com', 'Parent', '9876500000'
  ]);
});

test('Student update uses the default database connection', async t => {
  let captured;
  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [{ affectedRows: 1 }];
  });

  await Student.update('STU101', {
    name: 'Updated Student',
    phone: '9876543210'
  });

  assert.match(captured.sql, /UPDATE students SET/);
  assert.deepEqual(captured.params, [
    'Updated Student', '9876543210', 'STU101'
  ]);
});

test('Student update supports a custom connection', async () => {
  let captured;
  const connection = {
    query: async (sql, params) => {
      captured = { sql, params };
      return [{ affectedRows: 1 }];
    }
  };

  await Student.update('STU101', { dept: 'IT' }, connection);

  assert.match(captured.sql, /UPDATE students SET dept=\?/);
  assert.deepEqual(captured.params, ['IT', 'STU101']);
});

test('Student status update uses supplied connection', async () => {
  let captured;
  const connection = {
    query: async (sql, params) => {
      captured = { sql, params };
      return [{ affectedRows: 1 }];
    }
  };

  await Student.setStatus('STU101', 'Inactive', connection);

  assert.match(captured.sql, /UPDATE students SET status=\? WHERE id=\?/);
  assert.deepEqual(captured.params, ['Inactive', 'STU101']);
});

test('Student archive deactivates student, user and active room allocation', async () => {
  const calls = [];
  const connection = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      return [{ affectedRows: 1 }];
    }
  };

  await Student.archive(connection, 'STU101');

  assert.equal(calls.length, 3);
  assert.match(calls[0].sql, /UPDATE students SET is_active=0/);
  assert.match(calls[1].sql, /UPDATE users SET is_active=0/);
  assert.match(calls[2].sql, /UPDATE room_allocations SET checked_out_at=NOW\(\)/);
  for (const call of calls) {
    assert.deepEqual(call.params, ['STU101']);
  }
});

test('Student hard delete removes the requested student', async t => {
  let captured;
  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [{ affectedRows: 1 }];
  });

  await Student.hardDelete('STU101');

  assert.match(captured.sql, /DELETE FROM students WHERE id=\?/);
  assert.deepEqual(captured.params, ['STU101']);
});
