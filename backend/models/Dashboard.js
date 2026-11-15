const db = require('../config/database');
const n = v => Number(v) || 0;

exports.summary = async hostel => {
  const gs = hostel ? ' AND s.gender=?' : '', gp = hostel ? [hostel] : [];
  const NOT_LEAVE = "NOT EXISTS(SELECT 1 FROM leaves l WHERE l.student_id=s.id AND l.status='Approved' AND l.depart_at<=NOW() AND l.return_at>=NOW())";
  const SCANNED = "EXISTS(SELECT 1 FROM biometric_events e WHERE e.student_id=s.id AND e.result='SUCCESS' AND e.event_time>=CURDATE())";

  const [[st]] = await db.query(
    `SELECT COUNT(*) total, CAST(COALESCE(SUM(s.gender='Boys'),0) AS UNSIGNED) boys, CAST(COALESCE(SUM(s.gender='Girls'),0) AS UNSIGNED) girls,
       CAST(COALESCE(SUM(s.status='Inside'),0) AS UNSIGNED) inside, CAST(COALESCE(SUM(s.status='College'),0) AS UNSIGNED) college,
       CAST(COALESCE(SUM(s.status='On Leave'),0) AS UNSIGNED) onLeave, CAST(COALESCE(SUM(s.status='Home'),0) AS UNSIGNED) home
     FROM students s WHERE s.is_active=1${gs}`, gp);
  const [[rm]] = await db.query(
    `SELECT COUNT(*) total, CAST(COALESCE(SUM(occ>0),0) AS UNSIGNED) occupied, CAST(COALESCE(SUM(occ<capacity),0) AS UNSIGNED) available,
       CAST(COALESCE(SUM(capacity),0) AS UNSIGNED) beds, CAST(COALESCE(SUM(occ),0) AS UNSIGNED) bedsOccupied
     FROM (SELECT r.id,r.capacity,COUNT(a.id) occ FROM rooms r LEFT JOIN room_allocations a ON a.room_id=r.id AND a.checked_out_at IS NULL
           WHERE r.is_active=1${hostel ? ' AND r.hostel=?' : ''} GROUP BY r.id) t`, gp);
  const [[pr]] = await db.query(`SELECT COUNT(*) c FROM students s WHERE s.is_active=1${gs} AND ${SCANNED}`, gp);
  const [[ab]] = await db.query(`SELECT COUNT(*) c FROM students s WHERE s.is_active=1${gs} AND NOT ${SCANNED} AND ${NOT_LEAVE}`, gp);
  const [[pl]] = await db.query(`SELECT COUNT(*) c FROM leaves l JOIN students s ON s.id=l.student_id AND s.is_active=1 WHERE l.status='Pending'${gs}`, gp);
  const [[oc]] = await db.query(`SELECT COUNT(*) c FROM complaints c JOIN students s ON s.id=c.student_id AND s.is_active=1 WHERE c.status<>'Resolved'${gs}`, gp);
  const [[oe]] = await db.query(`SELECT COUNT(*) c FROM emergencies e JOIN students s ON s.id=e.student_id AND s.is_active=1 WHERE e.status IN ('Pending','Approved')${gs}`, gp);
  const [[od]] = await db.query(`SELECT COUNT(*) c FROM leaves l JOIN students s ON s.id=l.student_id AND s.is_active=1 WHERE l.status='Approved' AND l.return_at<NOW() AND s.status='On Leave'${gs}`, gp);

  const total = n(st.total), present = n(pr.c), absent = n(ab.c);
  return {
    hostel: hostel || 'All',
    students: { total, boys: n(st.boys), girls: n(st.girls), inside: n(st.inside), college: n(st.college), onLeave: n(st.onLeave), home: n(st.home) },
    rooms: { total: n(rm.total), occupied: n(rm.occupied), available: n(rm.available), beds: n(rm.beds), bedsOccupied: n(rm.bedsOccupied) },
    attendanceToday: { present, absent, onLeave: Math.max(total - present - absent, 0) },
    pendingLeaves: n(pl.c), openComplaints: n(oc.c), openEmergencies: n(oe.c), overdueReturns: n(od.c)
  };
};
