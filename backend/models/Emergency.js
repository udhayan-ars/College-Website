const db = require('../config/database');

exports.create = async (studentId, category, reason, dest, ret) =>
  (await db.query('INSERT INTO emergencies (student_id,category,reason,destination,expected_return) VALUES (?,?,?,?,?)', [studentId, category, reason, dest, ret]))[0].insertId;

exports.get = async id => (await db.query('SELECT * FROM emergencies WHERE id=?', [id]))[0][0];

exports.list = async ({ studentId, hostel, status, limit } = {}) => {
  const w = ['1=1'], p = [];
  if (studentId) { w.push('e.student_id=?'); p.push(studentId); }
  if (hostel) { w.push('s.gender=?'); p.push(hostel); }
  if (status) { w.push('e.status=?'); p.push(status); }
  p.push(Math.min(parseInt(limit, 10) || 500, 1000));
  return (await db.query(
    `SELECT e.id,e.student_id,s.name,e.category,e.reason,e.destination,e.expected_return,e.status,e.created_at
     FROM emergencies e JOIN students s ON s.id=e.student_id AND s.is_active=1
     WHERE ${w.join(' AND ')} ORDER BY e.id DESC LIMIT ?`, p))[0];
};

exports.setStatus = (id, status) => db.query('UPDATE emergencies SET status=? WHERE id=?', [status, id]);
