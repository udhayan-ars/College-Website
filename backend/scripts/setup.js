// Creates the database, tables, triggers, default menu/rules and the first admin account.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!/^[A-Za-z0-9_]+$/.test(DB_NAME || '')) throw new Error('DB_NAME is missing or invalid in .env');
  const c = await mysql.createConnection({ host: DB_HOST || 'localhost', port: Number(DB_PORT) || 3306, user: DB_USER, password: DB_PASSWORD });
  await c.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await c.query(`USE \`${DB_NAME}\``);

  const sql = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8').replace(/^--.*$/gm, '');
  for (const st of sql.split(';').map(s => s.trim()).filter(Boolean)) {
    if (/^(CREATE DATABASE|USE)\b/i.test(st)) continue;
    await c.query(st);
  }

  const menu = [['Breakfast', '7:30 - 9:00', 'Idli, Sambar, Chutney'], ['Lunch', '12:30 - 2:00', 'Rice, Dal, Veg Curry, Curd'],
    ['Snacks', '4:30 - 5:30', 'Tea, Biscuits, Sundal'], ['Dinner', '7:30 - 9:00', 'Chapati, Kurma, Rice']];
  for (const m of menu) await c.query('INSERT IGNORE INTO mess_menu (meal,serving_time,items) VALUES (?,?,?)', m);

  const [[{ n }]] = await c.query('SELECT COUNT(*) AS n FROM rules');
  if (!n) {
    const rules = ['Entry timing: students must be inside the hostel by 8:00 PM.', 'Attendance is recorded automatically by biometric devices.',
      'Apply for leave through the portal before departure.', 'Visitors are allowed only in the visitor area with approval.',
      'Keep rooms clean and report damage promptly.', 'In emergencies contact the warden immediately.'];
    for (const [i, r] of rules.entries()) await c.query('INSERT INTO rules (sort_order,rule_text) VALUES (?,?)', [i, r]);
  }

  const [[{ a }]] = await c.query("SELECT COUNT(*) AS a FROM users WHERE role='admin'");
  if (!a) {
    if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) throw new Error('Set ADMIN_PASSWORD (8+ characters) in .env to create the first admin.');
    await c.query("INSERT INTO users (username,password_hash,role,full_name) VALUES (?,?,'admin',?)",
      [ADMIN_USERNAME || 'chairman', await bcrypt.hash(ADMIN_PASSWORD, 12), ADMIN_NAME || 'Chairman']);
    console.log('Admin account created.');
  }
  await c.end();
  console.log('Database setup complete.');
})().catch(e => { console.error('Setup failed:', e.message); process.exit(1); });
