const db = require('../config/database');
const { AppError } = require('../utils/errors');

// Inserts an immutable biometric event and updates the student's current status.
exports.record = ({ studentId, deviceId, type, result }) => db.withTx(async c => {
  const [[s]] = await c.query('SELECT id,status FROM students WHERE id=? AND is_active=1 FOR UPDATE', [studentId]);
  if (!s) throw new AppError(404, 'Student not found.');
  const [r] = await c.query('INSERT INTO biometric_events (student_id,device_id,event_type,result) VALUES (?,?,?,?)', [studentId, deviceId, type, result]);
  let status = s.status;
  if (result === 'SUCCESS') {
    if (type === 'ENTRY') status = 'Inside';
    else {
      const [[l]] = await c.query("SELECT id FROM leaves WHERE student_id=? AND status='Approved' AND depart_at<=NOW() AND return_at>=NOW() LIMIT 1", [studentId]);
      status = l ? 'On Leave' : 'College';
    }
    await c.query('UPDATE students SET status=? WHERE id=?', [status, studentId]);
  }
  return { id: r.insertId, status };
});

exports.events = async ({ studentId, hostel, from, to, limit } = {}) => {
  const w = ['1=1'], p = [];
  if (studentId) { w.push('e.student_id=?'); p.push(studentId); }
  if (hostel) { w.push('s.gender=?'); p.push(hostel); }
  if (from) { w.push('e.event_time>=?'); p.push(from); }
  if (to) { w.push('e.event_time<DATE_ADD(?,INTERVAL 1 DAY)'); p.push(to); }
  p.push(Math.min(parseInt(limit, 10) || 200, 1000));
  return (await db.query(
    `SELECT e.id,e.student_id,s.name,e.device_id,e.event_type,e.result,e.event_time
     FROM biometric_events e JOIN students s ON s.id=e.student_id AND s.is_active=1
     WHERE ${w.join(' AND ')} ORDER BY e.id DESC LIMIT ?`, p))[0];
};

exports.daily = async (date, hostel) => {
  const p = [date, date, date, date];
  let g = '';
  if (hostel) { g = ' AND s.gender=?'; p.push(hostel); }
  return (await db.query(
    `SELECT s.id,s.name,s.gender,MIN(e.event_time) AS first_scan,MAX(e.event_time) AS last_scan,COUNT(e.id) AS scans,
       IF(COUNT(e.id)>0,'Present',IF(EXISTS(SELECT 1 FROM leaves l WHERE l.student_id=s.id AND l.status='Approved'
         AND l.depart_at<DATE_ADD(?,INTERVAL 1 DAY) AND l.return_at>=?),'On Leave','Absent')) AS attendance
     FROM students s
     LEFT JOIN biometric_events e ON e.student_id=s.id AND e.result='SUCCESS' AND e.event_time>=? AND e.event_time<DATE_ADD(?,INTERVAL 1 DAY)
     WHERE s.is_active=1${g} GROUP BY s.id,s.name,s.gender ORDER BY s.id`, p))[0];
};

exports.report = async (from, to, hostel) => {
  const p = [from, to];
  let g = '';
  if (hostel) { g = ' AND s.gender=?'; p.push(hostel); }
  return (await db.query(
    `SELECT s.id,s.name,s.gender,COUNT(DISTINCT DATE(e.event_time)) AS days_present
     FROM students s LEFT JOIN biometric_events e ON e.student_id=s.id AND e.result='SUCCESS'
       AND e.event_time>=? AND e.event_time<DATE_ADD(?,INTERVAL 1 DAY)
     WHERE s.is_active=1${g} GROUP BY s.id,s.name,s.gender ORDER BY s.id`, p))[0];
};
