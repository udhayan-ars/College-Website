const db = require('../config/database');

exports.create = async (studentId, reason, dep, ret, dest) =>
  (await db.query('INSERT INTO leaves (student_id,reason,depart_at,return_at,destination) VALUES (?,?,?,?,?)', [studentId, reason, dep, ret, dest]))[0].insertId;

exports.get = async id => (await db.query('SELECT * FROM leaves WHERE id=?', [id]))[0][0];

exports.list = async ({ studentId, hostel, status, limit } = {}) => {
  const w = ['1=1'], p = [];
  if (studentId) { w.push('l.student_id=?'); p.push(studentId); }
  if (hostel) { w.push('s.gender=?'); p.push(hostel); }
  if (status) { w.push('l.status=?'); p.push(status); }
  p.push(Math.min(parseInt(limit, 10) || 500, 1000));
  return (await db.query(
    `SELECT l.id,l.student_id,s.name,l.reason,l.depart_at,l.return_at,l.destination,l.status,l.decided_at,l.created_at
     FROM leaves l JOIN students s ON s.id=l.student_id AND s.is_active=1
     WHERE ${w.join(' AND ')} ORDER BY l.id DESC LIMIT ?`, p))[0];
};

exports.decide = async (id, status, userId) =>
  (await db.query("UPDATE leaves SET status=?,decided_by=?,decided_at=NOW() WHERE id=? AND status='Pending'", [status, userId, id]))[0].affectedRows > 0;
