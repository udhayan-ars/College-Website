const db = require('../config/database');

exports.create = async (studentId, category, description) =>
  (await db.query('INSERT INTO complaints (student_id,category,description) VALUES (?,?,?)', [studentId, category, description]))[0].insertId;

exports.get = async id => (await db.query('SELECT * FROM complaints WHERE id=?', [id]))[0][0];

exports.list = async ({ studentId, hostel, status, limit } = {}) => {
  const w = ['1=1'], p = [];
  if (studentId) { w.push('c.student_id=?'); p.push(studentId); }
  if (hostel) { w.push('s.gender=?'); p.push(hostel); }
  if (status) { w.push('c.status=?'); p.push(status); }
  p.push(Math.min(parseInt(limit, 10) || 500, 1000));
  return (await db.query(
    `SELECT c.id,c.student_id,s.name,c.category,c.description,c.status,c.created_at,c.updated_at
     FROM complaints c JOIN students s ON s.id=c.student_id AND s.is_active=1
     WHERE ${w.join(' AND ')} ORDER BY c.id DESC LIMIT ?`, p))[0];
};

exports.setStatus = (id, status) => db.query('UPDATE complaints SET status=? WHERE id=?', [status, id]);
