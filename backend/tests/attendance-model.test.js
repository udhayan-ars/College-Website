const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../config/database');
const Attendance = require('../models/Attendance');

test('Attendance record handles successful ENTRY', async t => {
  const calls = [];

  t.mock.method(db, 'withTx', async fn => fn({
    query: async (sql, params) => {
      calls.push({ sql, params });

      if (sql.includes('SELECT id,status')) {
        return [[{ id: 'STU301', status: 'College' }]];
      }

      if (sql.includes('INSERT INTO biometric_events')) {
        return [{ insertId: 51 }];
      }

      return [{ affectedRows: 1 }];
    }
  }));

  const result = await Attendance.record({
    studentId: 'STU301',
    deviceId: 'DEVICE01',
    type: 'ENTRY',
    result: 'SUCCESS'
  });

  assert.deepEqual(result, { id: 51, status: 'Inside' });
  assert.equal(calls.length, 3);
  assert.match(calls[2].sql, /UPDATE students SET status=\?/);
  assert.deepEqual(calls[2].params, ['Inside', 'STU301']);
});

test('Attendance record handles successful EXIT without approved leave', async t => {
  const calls = [];

  t.mock.method(db, 'withTx', async fn => fn({
    query: async (sql, params) => {
      calls.push({ sql, params });

      if (sql.includes('SELECT id,status')) {
        return [[{ id: 'STU301', status: 'Inside' }]];
      }

      if (sql.includes('INSERT INTO biometric_events')) {
        return [{ insertId: 52 }];
      }

      if (sql.includes('SELECT id FROM leaves')) {
        return [[]];
      }

      return [{ affectedRows: 1 }];
    }
  }));

  const result = await Attendance.record({
    studentId: 'STU301',
    deviceId: 'DEVICE01',
    type: 'EXIT',
    result: 'SUCCESS'
  });

  assert.deepEqual(result, { id: 52, status: 'College' });
  assert.equal(calls.length, 4);
  assert.match(calls[2].sql, /status='Approved'/);
  assert.deepEqual(calls[3].params, ['College', 'STU301']);
});

test('Attendance record sets On Leave for EXIT during approved leave', async t => {
  t.mock.method(db, 'withTx', async fn => fn({
    query: async sql => {
      if (sql.includes('SELECT id,status')) {
        return [[{ id: 'STU301', status: 'Inside' }]];
      }

      if (sql.includes('INSERT INTO biometric_events')) {
        return [{ insertId: 53 }];
      }

      if (sql.includes('SELECT id FROM leaves')) {
        return [[{ id: 7 }]];
      }

      return [{ affectedRows: 1 }];
    }
  }));

  const result = await Attendance.record({
    studentId: 'STU301',
    deviceId: 'DEVICE01',
    type: 'EXIT',
    result: 'SUCCESS'
  });

  assert.deepEqual(result, { id: 53, status: 'On Leave' });
});

test('Attendance record rejects a missing student', async t => {
  t.mock.method(db, 'withTx', async fn => fn({
    query: async () => [[]]
  }));

  await assert.rejects(
    Attendance.record({
      studentId: 'STU999',
      deviceId: 'DEVICE01',
      type: 'ENTRY',
      result: 'SUCCESS'
    }),
    { status: 404, message: 'Student not found.' }
  );
});

test('Attendance record stores failed biometric result without status update', async t => {
  const calls = [];

  t.mock.method(db, 'withTx', async fn => fn({
    query: async (sql, params) => {
      calls.push({ sql, params });

      if (sql.includes('SELECT id,status')) {
        return [[{ id: 'STU301', status: 'College' }]];
      }

      if (sql.includes('INSERT INTO biometric_events')) {
        return [{ insertId: 54 }];
      }

      return [{ affectedRows: 1 }];
    }
  }));

  const result = await Attendance.record({
    studentId: 'STU301',
    deviceId: 'DEVICE01',
    type: 'ENTRY',
    result: 'FAILED'
  });

  assert.deepEqual(result, { id: 54, status: 'College' });
  assert.equal(calls.length, 2);
  assert.equal(calls.some(call => call.sql.includes('UPDATE students')), false);
});

test('Attendance events applies filters and limit', async t => {
  let captured;

  const rows = [{ id: 10, student_id: 'STU301' }];

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [rows];
  });

  const result = await Attendance.events({
    studentId: 'STU301',
    hostel: 'Boys',
    from: '2026-11-01',
    to: '2026-11-15',
    limit: 50
  });

  assert.deepEqual(result, rows);
  assert.match(captured.sql, /e\.student_id=\?/);
  assert.match(captured.sql, /s\.gender=\?/);
  assert.match(captured.sql, /e\.event_time>=\?/);
  assert.match(captured.sql, /e\.event_time<DATE_ADD/);
  assert.deepEqual(captured.params, [
    'STU301', 'Boys', '2026-11-01', '2026-11-15', 50
  ]);
});

test('Attendance events uses default filters and limit', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  const result = await Attendance.events();

  assert.deepEqual(result, []);
  assert.match(captured.sql, /ORDER BY e\.id DESC LIMIT \?/);
  assert.deepEqual(captured.params, [200]);
});

test('Attendance events caps maximum limit', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Attendance.events({ limit: 5000 });

  assert.deepEqual(captured.params, [1000]);
});

test('Attendance daily applies hostel filter', async t => {
  let captured;

  const rows = [{ id: 'STU301', attendance: 'Present' }];

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [rows];
  });

  const result = await Attendance.daily('2026-11-16', 'Boys');

  assert.deepEqual(result, rows);
  assert.match(captured.sql, /s\.is_active=1 AND s\.gender=\?/);
  assert.match(captured.sql, /AS attendance/);
  assert.deepEqual(captured.params, [
    '2026-11-16',
    '2026-11-16',
    '2026-11-16',
    '2026-11-16',
    'Boys'
  ]);
});

test('Attendance daily works without hostel filter', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Attendance.daily('2026-11-16');

  assert.match(captured.sql, /WHERE s\.is_active=1 GROUP BY/);
  assert.deepEqual(captured.params, [
    '2026-11-16',
    '2026-11-16',
    '2026-11-16',
    '2026-11-16'
  ]);
});

test('Attendance report applies date range and hostel filter', async t => {
  let captured;

  const rows = [{ id: 'STU301', days_present: 10 }];

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [rows];
  });

  const result = await Attendance.report(
    '2026-11-01',
    '2026-11-16',
    'Boys'
  );

  assert.deepEqual(result, rows);
  assert.match(captured.sql, /COUNT\(DISTINCT DATE\(e\.event_time\)\)/);
  assert.match(captured.sql, /s\.gender=\?/);
  assert.deepEqual(captured.params, [
    '2026-11-01',
    '2026-11-16',
    'Boys'
  ]);
});

test('Attendance report works without hostel filter', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[]];
  });

  await Attendance.report('2026-11-01', '2026-11-16');

  assert.match(captured.sql, /WHERE s\.is_active=1 GROUP BY/);
  assert.deepEqual(captured.params, [
    '2026-11-01',
    '2026-11-16'
  ]);
});
