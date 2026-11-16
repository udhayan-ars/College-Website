const db = require('../config/database');
const MEALS = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
exports.MEALS = MEALS;

exports.audit = async (userId, action, details) => {
  try { await db.query('INSERT INTO audit_logs (user_id,action,details) VALUES (?,?,?)', [userId || null, action, details ? String(details).slice(0, 500) : null]); }
  catch (e) { console.error('Audit log failed:', e.message); }
};

// hostel: null = every notice (admin); otherwise notices for All + that hostel
exports.notices = async (hostel, limit = 100) => {
  const [rows] = hostel
    ? await db.query("SELECT id,hostel,message,created_at FROM notices WHERE hostel IN ('All',?) ORDER BY id DESC LIMIT ?", [hostel, limit])
    : await db.query('SELECT id,hostel,message,created_at FROM notices ORDER BY id DESC LIMIT ?', [limit]);
  return rows;
};
exports.addNotice = async (hostel, message, userId) =>
  (await db.query('INSERT INTO notices (hostel,message,created_by) VALUES (?,?,?)', [hostel, message, userId]))[0].insertId;

exports.menu = async () => (await db.query('SELECT meal,serving_time,items FROM mess_menu'))[0];
exports.updateMeal = (meal, items, time) =>
  db.query('UPDATE mess_menu SET items=?,serving_time=COALESCE(?,serving_time) WHERE meal=?', [items, time, meal]);

exports.rules = async () => (await db.query('SELECT id,rule_text FROM rules ORDER BY sort_order,id'))[0];
