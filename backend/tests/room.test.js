const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../config/database');
const Room = require('../models/Room');
const Student = require('../models/Student');
const controller = require('../controllers/roomController');

function runAction(action, user, options = {}) {
  return new Promise(resolve => {
    const req = {
      user,
      params: options.params || {},
      query: options.query || {},
      body: options.body || {}
    };

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

    Promise.resolve(controller[action](req, res, error => resolve({ error })))
      .catch(error => resolve({ error }));
  });
}

const admin = { id: 1, role: 'admin' };

const activeRoom = () => ({
  id: 10,
  room_no: 'A101',
  hostel: 'Boys',
  floor: 1,
  capacity: 2,
  occupied: 1,
  is_active: 1
});

const activeStudent = () => ({
  id: 'STU301',
  name: 'Test Student',
  gender: 'Boys',
  is_active: 1
});

test('Room list returns rooms', async t => {
  const rooms = [{ id: 10, room_no: 'A101' }];
  let filters;

  t.mock.method(Room, 'list', async f => {
    filters = f;
    return rooms;
  });

  const { response } = await runAction('list', admin, {
    query: { available: 'true', search: 'A101' }
  });

  assert.deepEqual(response.rooms, rooms);
  assert.equal(filters.available, true);
  assert.equal(filters.search, 'A101');
});

test('Room details return room and occupants', async t => {
  const occupants = [{ id: 'STU301', name: 'Test Student' }];

  t.mock.method(Room, 'get', async () => activeRoom());
  t.mock.method(Room, 'occupants', async () => occupants);

  const { response } = await runAction('get', admin, {
    params: { id: '10' }
  });

  assert.equal(response.room.id, 10);
  assert.deepEqual(response.occupants, occupants);
});

test('Room lookup rejects a missing room', async t => {
  t.mock.method(Room, 'get', async () => null);

  const { error } = await runAction('get', admin, {
    params: { id: '99' }
  });

  assert.equal(error.status, 404);
});

test('Room creation succeeds with valid data', async t => {
  let createdRoom;

  t.mock.method(Room, 'create', async fields => {
    createdRoom = fields;
    return 10;
  });

  t.mock.method(Room, 'get', async () => activeRoom());
  t.mock.method(db, 'query', async () => []);

  const { status, response } = await runAction('create', admin, {
    body: {
      roomNo: 'A101',
      hostel: 'Boys',
      floor: 1,
      capacity: 2
    }
  });

  assert.equal(status, 201);
  assert.equal(response.message, 'Room created.');
  assert.equal(createdRoom.roomNo, 'A101');
  assert.equal(createdRoom.hostel, 'Boys');
});

test('Warden cannot create a room in another hostel', async () => {
  const { error } = await runAction('create', {
    id: 2,
    role: 'warden',
    hostel: 'Boys'
  }, {
    body: {
      roomNo: 'G101',
      hostel: 'Girls'
    }
  });

  assert.equal(error.status, 403);
});

test('Room update rejects capacity below current occupancy', async t => {
  t.mock.method(Room, 'get', async () => ({
    ...activeRoom(),
    occupied: 2
  }));

  const { error } = await runAction('update', admin, {
    params: { id: '10' },
    body: { capacity: 1 }
  });

  assert.equal(error.status, 409);
});

test('Room update succeeds with valid data', async t => {
  let updatedFields;

  t.mock.method(Room, 'get', async () => activeRoom());

  t.mock.method(Room, 'update', async (id, fields) => {
    updatedFields = { id, fields };
  });

  t.mock.method(db, 'query', async () => []);

  const { response } = await runAction('update', admin, {
    params: { id: '10' },
    body: { floor: 2 }
  });

  assert.equal(response.message, 'Room updated.');
  assert.equal(updatedFields.id, 10);
  assert.equal(updatedFields.fields.floor, 2);
});

test('Room removal rejects a room with occupants', async t => {
  t.mock.method(Room, 'get', async () => activeRoom());

  const { error } = await runAction('remove', admin, {
    params: { id: '10' }
  });

  assert.equal(error.status, 409);
});

test('Student check-in succeeds', async t => {
  let allocation;

  t.mock.method(Student, 'get', async () => activeStudent());
  t.mock.method(Room, 'get', async () => activeRoom());

  t.mock.method(db, 'withTx', async fn => fn({}));

  t.mock.method(Room, 'allocate', async (conn, studentId, roomId) => {
    allocation = { studentId, roomId };
  });

  t.mock.method(db, 'query', async () => []);

  const { status, response } = await runAction('allocate', admin, {
    body: { studentId: 'STU301', roomId: 10 }
  });

  assert.equal(status, 201);
  assert.equal(response.message, 'Student checked in to room.');
  assert.equal(allocation.studentId, 'STU301');
  assert.equal(allocation.roomId, 10);
});

test('Student check-out succeeds', async t => {
  t.mock.method(Student, 'get', async () => activeStudent());
  t.mock.method(Room, 'checkout', async () => {});
  t.mock.method(db, 'query', async () => []);

  const { response } = await runAction('checkout', admin, {
    body: { studentId: 'STU301' }
  });

  assert.equal(response.message, 'Student checked out of room.');
});

test('Student room history is returned', async t => {
  const history = [{ room_no: 'A101', hostel: 'Boys' }];

  t.mock.method(Student, 'get', async () => activeStudent());
  t.mock.method(Room, 'history', async () => history);

  const { response } = await runAction('history', admin, {
    params: { studentId: 'STU301' }
  });

  assert.deepEqual(response.history, history);
});
