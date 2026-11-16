const db = require('../config/database');
const COLS = 'id,username,password_hash,role,full_name,hostel,student_id,is_active';

exports.findByUsername = async u => (await db.query(`SELECT ${COLS} FROM users WHERE username=?`, [u]))[0][0];
exports.findById = async id => (await db.query(`SELECT ${COLS} FROM users WHERE id=?`, [id]))[0][0];
exports.list = async () => (await db.query('SELECT id,username,role,full_name,hostel,student_id,is_active,created_at FROM users ORDER BY id'))[0];

exports.create = async (u, conn = db) => {
  const [r] = await conn.query(
    'INSERT INTO users (username,password_hash,role,full_name,hostel,student_id) VALUES (?,?,?,?,?,?)',
    [u.username, u.hash, u.role, u.fullName, u.hostel || null, u.studentId || null]);
  return r.insertId;
};

// fields: object of column -> value (column names come from controller whitelists only)
exports.update = async (id, fields, conn = db) => {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  await conn.query(`UPDATE users SET ${keys.map(k => `${k}=?`).join(',')} WHERE id=?`, [...keys.map(k => fields[k]), id]);
};
