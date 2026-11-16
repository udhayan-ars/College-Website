const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../config/database');
const Room = require('../models/Room');

test('Room list applies hostel and search filters', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[{ id: 10, room_no: 'A101' }]];
  });

  const rows = await Room.list({
    hostel: 'Boys',
    available: true,
    search: 'A101'
  });

  assert.equal(rows[0].room_no, 'A101');
  assert.match(captured.sql, /r\.hostel=\?/);
  assert.match(captured.sql, /r\.room_no LIKE \?/);
  assert.match(captured.sql, /HAVING available>0/);
  assert.deepEqual(captured.params, ['Boys', '%A101%']);
});

test('Room list works without optional filters', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [[{ id: 10 }]];
  });

  const rows = await Room.list();

  assert.equal(rows.length, 1);
  assert.match(captured.sql, /r\.is_active=1/);
  assert.deepEqual(captured.params, []);
});

test('Room get returns the requested room', async t => {
  const room = { id: 10, room_no: 'A101' };

  t.mock.method(db, 'query', async (sql, params) => {
    assert.match(sql, /WHERE r\.id=\?/);
    assert.deepEqual(params, [10]);
    return [[room]];
  });

  assert.deepEqual(await Room.get(10), room);
});

test('Room get returns undefined when room is missing', async t => {
  t.mock.method(db, 'query', async () => [[]]);

  assert.equal(await Room.get(99), undefined);
});

test('Room occupants returns current occupants', async t => {
  const occupants = [{ id: 'STU301', name: 'Test Student' }];

  t.mock.method(db, 'query', async (sql, params) => {
    assert.match(sql, /checked_out_at IS NULL/);
    assert.deepEqual(params, [10]);
    return [occupants];
  });

  assert.deepEqual(await Room.occupants(10), occupants);
});

test('Room create inserts room and returns insert ID', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [{ insertId: 25 }];
  });

  const id = await Room.create({
    roomNo: 'A102',
    hostel: 'Boys',
    floor: 1,
    capacity: 3
  });

  assert.equal(id, 25);
  assert.match(captured.sql, /INSERT INTO rooms/);
  assert.deepEqual(captured.params, ['A102', 'Boys', 1, 3]);
});

test('Room update changes supplied fields', async t => {
  let captured;

  t.mock.method(db, 'query', async (sql, params) => {
    captured = { sql, params };
    return [{ affectedRows: 1 }];
  });

  await Room.update(10, {
    floor: 2,
    capacity: 3
  });

  assert.match(captured.sql, /UPDATE rooms SET/);
  assert.deepEqual(captured.params, [2, 3, 10]);
});

test('Room update does nothing when no fields are supplied', async t => {
  t.mock.method(db, 'query', async () => {
    assert.fail('Database should not be queried');
  });

  await Room.update(10, {});
});

test('Room allocation succeeds for a matching student and room', async () => {
  const calls = [];

  const connection = {
    query: async (sql, params) => {
      calls.push({ sql, params });

      if (sql.includes('SELECT id,gender')) {
        return [[{ id: 'STU301', gender: 'Boys' }]];
      }

      if (sql.includes('SELECT id,hostel,capacity')) {
        return [[{ id: 10, hostel: 'Boys', capacity: 2 }]];
      }

      if (sql.includes('SELECT COUNT(*)')) {
        return [[{ n: 1 }]];
      }

      if (sql.includes('INSERT INTO room_allocations')) {
        return [{ insertId: 50 }];
      }

      return [{ affectedRows: 1 }];
    }
  };

  const id = await Room.allocate(connection, 'STU301', 10);

  assert.equal(id, 50);
  assert.equal(calls.length, 5);
});

test('Room allocation rejects a missing student', async () => {
  const connection = {
    query: async () => [[]]
  };

  await assert.rejects(
    Room.allocate(connection, 'STU999', 10),
    { status: 404, message: 'Student not found.' }
  );
});

test('Room allocation rejects a missing room', async () => {
  const connection = {
    query: async sql => {
      if (sql.includes('SELECT id,gender')) {
        return [[{ id: 'STU301', gender: 'Boys' }]];
      }
      return [[]];
    }
  };

  await assert.rejects(
    Room.allocate(connection, 'STU301', 10),
    { status: 404, message: 'Room not found.' }
  );
});

test('Room allocation rejects a hostel mismatch', async () => {
  const connection = {
    query: async sql => {
      if (sql.includes('SELECT id,gender')) {
        return [[{ id: 'STU301', gender: 'Boys' }]];
      }
      return [[{ id: 10, hostel: 'Girls', capacity: 2 }]];
    }
  };

  await assert.rejects(
    Room.allocate(connection, 'STU301', 10),
    { status: 400 }
  );
});

test('Room allocation rejects a full room', async () => {
  const connection = {
    query: async sql => {
      if (sql.includes('SELECT id,gender')) {
        return [[{ id: 'STU301', gender: 'Boys' }]];
      }
      if (sql.includes('SELECT id,hostel,capacity')) {
        return [[{ id: 10, hostel: 'Boys', capacity: 2 }]];
      }
      if (sql.includes('SELECT COUNT(*)')) {
        return [[{ n: 2 }]];
      }
      return [{ affectedRows: 1 }];
    }
  };

  await assert.rejects(
    Room.allocate(connection, 'STU301', 10),
    { status: 409, message: 'Room is full.' }
  );
});

test('Room checkout succeeds when an allocation exists', async t => {
  t.mock.method(db, 'query', async () => [
    { affectedRows: 1 }
  ]);

  await assert.doesNotReject(Room.checkout('STU301'));
});

test('Room checkout rejects a student without an active allocation', async t => {
  t.mock.method(db, 'query', async () => [
    { affectedRows: 0 }
  ]);

  await assert.rejects(
    Room.checkout('STU301'),
    { status: 404 }
  );
});

test('Room history returns allocation history', async t => {
  const history = [{ id: 50, room_no: 'A101', hostel: 'Boys' }];

  t.mock.method(db, 'query', async (sql, params) => {
    assert.match(sql, /ORDER BY a\.id DESC/);
    assert.deepEqual(params, ['STU301']);
    return [history];
  });

  assert.deepEqual(await Room.history('STU301'), history);
});
