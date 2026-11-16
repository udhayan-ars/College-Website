const db = require('../config/database');
const Room = require('../models/Room');
const v = require('../utils/validate');
const { AppError, asyncHandler } = require('../utils/errors');
const { hostelScope, assertHostel, studentAccess } = require('../utils/access');
const { audit } = require('../models/Content');

const load = async (req, id) => {
  const room = await Room.get(id);
  if (!room || !room.is_active) throw new AppError(404, 'Room not found.');
  assertHostel(req, room.hostel);
  return room;
};

exports.list = asyncHandler(async (req, res) =>
  res.json({ rooms: await Room.list({ hostel: hostelScope(req), available: req.query.available === 'true', search: req.query.search }) }));

exports.get = asyncHandler(async (req, res) => {
  const room = await load(req, v.int(req.params.id, 'Room id', { min: 1 }));
  res.json({ room, occupants: await Room.occupants(room.id) });
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const hostel = v.oneOf(b.hostel, v.HOSTELS, 'Hostel');
  if (req.user.role === 'warden' && hostel !== req.user.hostel) throw new AppError(403, 'You can only add rooms to your own hostel.');
  const id = await Room.create({
    roomNo: v.str(b.roomNo, 'Room number', { max: 20 }), hostel,
    floor: v.int(b.floor ?? 0, 'Floor', { max: 100 }), capacity: v.int(b.capacity ?? 2, 'Capacity', { min: 1, max: 12 })
  });
  await audit(req.user.id, 'ROOM_CREATE', String(id));
  res.status(201).json({ message: 'Room created.', room: await Room.get(id) });
});

exports.update = asyncHandler(async (req, res) => {
  const room = await load(req, v.int(req.params.id, 'Room id', { min: 1 }));
  const f = {};
  if (req.body.roomNo !== undefined) f.room_no = v.str(req.body.roomNo, 'Room number', { max: 20 });
  if (req.body.floor !== undefined) f.floor = v.int(req.body.floor, 'Floor', { max: 100 });
  if (req.body.capacity !== undefined) {
    f.capacity = v.int(req.body.capacity, 'Capacity', { min: 1, max: 12 });
    if (f.capacity < room.occupied) throw new AppError(409, `Capacity cannot be lower than the current ${room.occupied} occupant(s).`);
  }
  if (!Object.keys(f).length) throw new AppError(400, 'No updatable fields supplied.');
  await Room.update(room.id, f);
  await audit(req.user.id, 'ROOM_UPDATE', String(room.id));
  res.json({ message: 'Room updated.', room: await Room.get(room.id) });
});

exports.remove = asyncHandler(async (req, res) => {
  const room = await load(req, v.int(req.params.id, 'Room id', { min: 1 }));
  if (room.occupied > 0) throw new AppError(409, 'Room still has occupants. Check them out first.');
  await Room.update(room.id, { is_active: 0 });
  await audit(req.user.id, 'ROOM_DEACTIVATE', String(room.id));
  res.json({ message: 'Room deactivated.' });
});

exports.allocate = asyncHandler(async (req, res) => {
  const studentId = v.studentId(req.body.studentId);
  const roomId = v.int(req.body.roomId, 'Room id', { min: 1 });
  await studentAccess(req, studentId);
  await load(req, roomId);
  await db.withTx(c => Room.allocate(c, studentId, roomId));
  await audit(req.user.id, 'ROOM_CHECKIN', `${studentId} -> room ${roomId}`);
  res.status(201).json({ message: 'Student checked in to room.', room: await Room.get(roomId) });
});

exports.checkout = asyncHandler(async (req, res) => {
  const studentId = v.studentId(req.body.studentId);
  await studentAccess(req, studentId);
  await Room.checkout(studentId);
  await audit(req.user.id, 'ROOM_CHECKOUT', studentId);
  res.json({ message: 'Student checked out of room.' });
});

exports.history = asyncHandler(async (req, res) => {
  const id = v.studentId(req.params.studentId);
  await studentAccess(req, id);
  res.json({ history: await Room.history(id) });
});
