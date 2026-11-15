// Returns everything the portal needs for the logged-in role, shaped for the existing frontend.
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Complaint = require('../models/Complaint');
const Emergency = require('../models/Emergency');
const Content = require('../models/Content');
const Dashboard = require('../models/Dashboard');
const { asyncHandler } = require('../utils/errors');
const { hostelScope } = require('../utils/access');

const dt = s => (s ? String(s).slice(0, 16).replace(' ', 'T') : '');

exports.get = asyncHandler(async (req, res) => {
  const u = req.user, isStudent = u.role === 'student';
  const f = isStudent ? { studentId: u.student_id } : { hostel: hostelScope(req) };

  const [students, events, leaves, complaints, emergencies, notices, menu, rules, dashboard] = await Promise.all([
    isStudent ? Student.get(u.student_id).then(s => ({ rows: s ? [s] : [] })) : Student.list({ hostel: f.hostel, limit: 500 }),
    Attendance.events({ ...f, limit: 500 }),
    Leave.list(f), Complaint.list(f), Emergency.list(f),
    Content.notices(u.role === 'admin' ? null : u.hostel), Content.menu(), Content.rules(),
    isStudent ? Promise.resolve({}) : Dashboard.summary(f.hostel)
  ]);

  // The frontend expects oldest-first lists (it reverses them for display).
  const asc = a => a.slice().reverse();
  res.json({
    students: students.rows.map(s => ({
      id: s.id, name: s.name, gender: s.gender, dept: s.dept, year: s.year_of_study, room: s.room_no || 'Not allotted',
      phone: s.phone, parent: s.parent_info, status: s.status
    })),
    events: asc(events).map(e => ({ id: e.id, sid: e.student_id, time: e.event_time, device: e.device_id, type: e.event_type, result: e.result })),
    leaves: asc(leaves).map(l => ({ id: l.id, sid: l.student_id, reason: l.reason, from: dt(l.depart_at), to: dt(l.return_at), dest: l.destination, status: l.status })),
    complaints: asc(complaints).map(c => ({ id: c.id, sid: c.student_id, cat: c.category, desc: c.description, status: c.status, time: c.created_at })),
    emergencies: asc(emergencies).map(e => ({ id: e.id, sid: e.student_id, cat: e.category, reason: e.reason, dest: e.destination, ret: dt(e.expected_return), status: e.status, time: e.created_at })),
    notices: asc(notices).map(n => ({ id: n.id, to: n.hostel, text: n.message, time: n.created_at })),
    menu: Object.fromEntries(menu.map(m => [m.meal, { time: m.serving_time, items: m.items }])),
    rules: rules.map(r => r.rule_text),
    dashboard
  });
});
