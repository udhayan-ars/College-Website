const db = require('../config/database');

const BASE = `SELECT s.id,s.name,s.gender,s.dept,s.year_of_study,s.phone,s.email,s.parent_info,s.emergency_contact,
  s.joined_on,s.status,s.is_active,r.id AS room_id,r.room_no
  FROM students s
  LEFT JOIN room_allocations a ON a.student_id=s.id AND a.checked_out_at IS NULL
  LEFT JOIN rooms r ON r.id=a.room_id`;

exports.list = async (f = {}) => {
  const w = [`s.is_active=${f.archived ? 0 : 1}`], p = [];
  if (f.hostel) { w.push('s.gender=?'); p.push(f.hostel); }
  if (f.dept) { w.push('s.dept=?'); p.push(f.dept); }
  if (f.year) { w.push('s.year_of_study=?'); p.push(f.year); }
  if (f.status) { w.push('s.status=?'); p.push(f.status); }
  if (f.roomNo) { w.push('r.room_no=?'); p.push(f.roomNo); }
  if (f.search) { w.push('(s.name LIKE ? OR s.id LIKE ? OR s.phone LIKE ?)'); const q = `%${f.search}%`; p.push(q, q, q); }
  const limit = Math.min(parseInt(f.limit, 10) || 200, 500);
  const offset = Math.max(parseInt(f.offset, 10) || 0, 0);
  const where = w.join(' AND ');
  const [rows] = await db.query(`${BASE} WHERE ${where} ORDER BY s.id LIMIT ? OFFSET ?`, [...p, limit, offset]);
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM students s LEFT JOIN room_allocations a ON a.student_id=s.id AND a.checked_out_at IS NULL LEFT JOIN rooms r ON r.id=a.room_id WHERE ${where}`, p);
  return { rows, total };
};

exports.get = async id => (await db.query(`${BASE} WHERE s.id=?`, [id]))[0][0];

exports.create = (c, s) => c.query(
  'INSERT INTO students (id,name,gender,dept,year_of_study,phone,email,parent_info,emergency_contact,joined_on) VALUES (?,?,?,?,?,?,?,?,?,CURDATE())',
  [s.id, s.name, s.gender, s.dept, s.year, s.phone, s.email, s.parent, s.emergencyContact]);

// fields: column -> value (whitelisted by the controller)
exports.update = async (id, fields, conn = db) => {
  const keys = Object.keys(fields);
  await conn.query(`UPDATE students SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`, [...keys.map(k => fields[k]), id]);
};

exports.setStatus = (id, status, conn = db) => conn.query('UPDATE students SET status=? WHERE id=?', [status, id]);

exports.archive = async (c, id) => {
  await c.query('UPDATE students SET is_active=0 WHERE id=?', [id]);
  await c.query('UPDATE users SET is_active=0 WHERE student_id=?', [id]);
  await c.query('UPDATE room_allocations SET checked_out_at=NOW() WHERE student_id=? AND checked_out_at IS NULL', [id]);
};

exports.hardDelete = id => db.query('DELETE FROM students WHERE id=?', [id]);
