// Optional demo data: rooms, a warden per hostel, one staff user and 8 students (all use DEMO_PASSWORD).
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

(async () => {
  const pw = process.env.DEMO_PASSWORD;
  if (!pw || pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) throw new Error('Set DEMO_PASSWORD (8+ chars, letter and digit) in .env');
  const hash = await bcrypt.hash(pw, 12);

  const rooms = [['B-101', 'Boys', 1], ['B-102', 'Boys', 1], ['B-103', 'Boys', 1], ['B-104', 'Boys', 1], ['G-201', 'Girls', 2], ['G-202', 'Girls', 2], ['G-203', 'Girls', 2], ['G-204', 'Girls', 2]];
  for (const [no, h, f] of rooms) await pool.query('INSERT IGNORE INTO rooms (room_no,hostel,floor,capacity) VALUES (?,?,?,2)', [no, h, f]);

  const staff = [['wb', 'warden', "Boys' Hostel Warden", 'Boys'], ['wg', 'warden', "Girls' Hostel Warden", 'Girls'], ['sb', 'staff', 'Boys Hostel Staff', 'Boys']];
  for (const [u, r, n, h] of staff) await pool.query('INSERT IGNORE INTO users (username,password_hash,role,full_name,hostel) VALUES (?,?,?,?,?)', [u, hash, r, n, h]);

  const S = [['B001', 'Arun Kumar', 'Boys', 'CSE', '2nd', 'B-101'], ['B002', 'Vikram S', 'Boys', 'ECE', '3rd', 'B-102'], ['B003', 'Rahul M', 'Boys', 'MECH', '1st', 'B-103'],
    ['B004', 'Karthik R', 'Boys', 'IT', '4th', 'B-104'], ['G001', 'Priya Devi', 'Girls', 'CSE', '2nd', 'G-201'], ['G002', 'Anitha K', 'Girls', 'ECE', '3rd', 'G-202'],
    ['G003', 'Meena L', 'Girls', 'CIVIL', '1st', 'G-203'], ['G004', 'Divya P', 'Girls', 'IT', '4th', 'G-204']];
  for (const [i, [id, name, g, dept, yr, room]] of S.entries()) {
    await pool.withTx(async c => {
      const [r] = await c.query('INSERT IGNORE INTO students (id,name,gender,dept,year_of_study,phone,parent_info,joined_on) VALUES (?,?,?,?,?,?,?,CURDATE())',
        [id, name, g, dept, yr, `90000000${String(i + 1).padStart(2, '0')}`, `Parent of ${name}`]);
      if (!r.affectedRows) return;
      await c.query("INSERT INTO users (username,password_hash,role,full_name,hostel,student_id) VALUES (?,?,'student',?,?,?)", [id, hash, name, g, id]);
      await c.query('INSERT INTO room_allocations (student_id,room_id) SELECT ?,id FROM rooms WHERE room_no=?', [id, room]);
    });
  }
  console.log('Demo data ready. Logins: chairman (admin), wb / wg (wardens), sb (staff), B001-B004 / G001-G004 (students).');
  await pool.end();
})().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
