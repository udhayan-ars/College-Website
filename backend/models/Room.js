const db = require('../config/database');
const { AppError } = require('../utils/errors');

const LIST = `SELECT r.id,r.room_no,r.hostel,r.floor,r.capacity,r.is_active,
  COUNT(a.id) AS occupied, r.capacity-COUNT(a.id) AS available
  FROM rooms r LEFT JOIN room_allocations a ON a.room_id=r.id AND a.checked_out_at IS NULL`;

exports.list = async ({ hostel, available, search } = {}) => {
  const w = ['r.is_active=1'], p = [];
  if (hostel) { w.push('r.hostel=?'); p.push(hostel); }
  if (search) { w.push('r.room_no LIKE ?'); p.push(`%${search}%`); }
  const [rows] = await db.query(`${LIST} WHERE ${w.join(' AND ')} GROUP BY r.id ${available ? 'HAVING available>0' : ''} ORDER BY r.room_no`, p);
  return rows;
};

exports.get = async id => (await db.query(`${LIST} WHERE r.id=? GROUP BY r.id`, [id]))[0][0];

exports.occupants = async id => (await db.query(
  `SELECT s.id,s.name,s.dept,s.year_of_study,a.checked_in_at FROM room_allocations a
   JOIN students s ON s.id=a.student_id WHERE a.room_id=? AND a.checked_out_at IS NULL`, [id]))[0];

exports.create = async r => (await db.query('INSERT INTO rooms (room_no,hostel,floor,capacity) VALUES (?,?,?,?)', [r.roomNo, r.hostel, r.floor, r.capacity]))[0].insertId;

exports.update = async (id, fields) => {
  const keys = Object.keys(fields);
  if (keys.length) await db.query(`UPDATE rooms SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`, [...keys.map(k => fields[k]), id]);
};

// Check-in: allocate a student to a room (closes any previous open allocation = room change).
exports.allocate = async (c, studentId, roomId) => {
  const [[student]] = await c.query('SELECT id,gender FROM students WHERE id=? AND is_active=1 FOR UPDATE', [studentId]);
  if (!student) throw new AppError(404, 'Student not found.');
  const [[room]] = await c.query('SELECT id,hostel,capacity FROM rooms WHERE id=? AND is_active=1 FOR UPDATE', [roomId]);
  if (!room) throw new AppError(404, 'Room not found.');
  if (room.hostel !== student.gender) throw new AppError(400, `A student of the ${student.gender}' hostel cannot be placed in a ${room.hostel}' hostel room.`);
  await c.query('UPDATE room_allocations SET checked_out_at=NOW() WHERE student_id=? AND checked_out_at IS NULL', [studentId]);
  const [[{ n }]] = await c.query('SELECT COUNT(*) AS n FROM room_allocations WHERE room_id=? AND checked_out_at IS NULL', [roomId]);
  if (n >= room.capacity) throw new AppError(409, 'Room is full.');
  const [r] = await c.query('INSERT INTO room_allocations (student_id,room_id) VALUES (?,?)', [studentId, roomId]);
  return r.insertId;
};

// Check-out: close the student's open allocation.
exports.checkout = async studentId => {
  const [r] = await db.query('UPDATE room_allocations SET checked_out_at=NOW() WHERE student_id=? AND checked_out_at IS NULL', [studentId]);
  if (!r.affectedRows) throw new AppError(404, 'Student is not currently checked in to a room.');
};

exports.history = async studentId => (await db.query(
  `SELECT a.id,r.room_no,r.hostel,a.checked_in_at,a.checked_out_at FROM room_allocations a
   JOIN rooms r ON r.id=a.room_id WHERE a.student_id=? ORDER BY a.id DESC`, [studentId]))[0];
