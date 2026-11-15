const Attendance = require('../models/Attendance');
const v = require('../utils/validate');
const { AppError, asyncHandler } = require('../utils/errors');
const { hostelScope, studentAccess } = require('../utils/access');

const DEVICES = { Boys: 'BIO-B1', Girls: 'BIO-G1' };
const run = (studentId, deviceId, type, result) => Attendance.record({ studentId, deviceId, type, result });

// Called by the biometric hardware (x-device-key header).
exports.deviceEvent = asyncHandler(async (req, res) => {
  const studentId = v.studentId(req.body.studentId);
  const type = v.oneOf(req.body.eventType, ['ENTRY', 'EXIT'], 'eventType');
  const result = v.oneOf(req.body.result || 'SUCCESS', ['SUCCESS', 'FAILED'], 'result');
  const deviceId = v.str(req.body.deviceId, 'deviceId', { max: 30, optional: true }) || 'DEVICE';
  const r = await run(studentId, deviceId, type, result);
  res.status(201).json({ message: 'Biometric event recorded.', ...r });
});

// Demo simulator used by the portal (admin/warden). Writes the same immutable records.
exports.simulate = asyncHandler(async (req, res) => {
  const studentId = v.studentId(req.body.studentId);
  const ev = v.oneOf(req.body.event, ['ENTRY', 'EXIT', 'FAIL'], 'event');
  const s = await studentAccess(req, studentId);
  const r = await run(studentId, DEVICES[s.gender], ev === 'FAIL' ? 'EXIT' : ev, ev === 'FAIL' ? 'FAILED' : 'SUCCESS');
  res.status(201).json({ message: 'Biometric event recorded.', ...r });
});

exports.events = asyncHandler(async (req, res) => {
  const q = req.query;
  const studentId = q.studentId ? v.studentId(q.studentId) : undefined;
  if (studentId) await studentAccess(req, studentId);
  const events = await Attendance.events({
    studentId, hostel: hostelScope(req), from: q.from ? v.date(q.from, 'from') : undefined, to: q.to ? v.date(q.to, 'to') : undefined, limit: q.limit
  });
  res.json({ events });
});

exports.me = asyncHandler(async (req, res) => {
  const events = await Attendance.events({ studentId: req.user.student_id, limit: 200 });
  const verified = events.filter(e => e.result === 'SUCCESS').length;
  res.json({ summary: { verified, failed: events.length - verified }, events });
});

exports.daily = asyncHandler(async (req, res) => {
  const date = req.query.date ? v.date(req.query.date, 'date') : v.today();
  const records = await Attendance.daily(date, hostelScope(req));
  const count = k => records.filter(r => r.attendance === k).length;
  res.json({ date, summary: { total: records.length, present: count('Present'), absent: count('Absent'), onLeave: count('On Leave') }, records });
});

exports.report = asyncHandler(async (req, res) => {
  const to = req.query.to ? v.date(req.query.to, 'to') : v.today();
  const from = req.query.from ? v.date(req.query.from, 'from') : new Date(new Date(to + 'T00:00:00').getTime() - 29 * 86400000).toLocaleDateString('en-CA');
  const days = Math.round((new Date(to + 'T00:00:00') - new Date(from + 'T00:00:00')) / 86400000) + 1;
  if (days < 1) throw new AppError(400, '"to" must not be before "from".');
  if (days > 366) throw new AppError(400, 'Report range cannot exceed 366 days.');
  const rows = await Attendance.report(from, to, hostelScope(req));
  const students = rows.map(r => ({ ...r, total_days: days, percentage: Math.round((r.days_present / days) * 1000) / 10 }));
  res.json({ from, to, totalDays: days, students });
});
