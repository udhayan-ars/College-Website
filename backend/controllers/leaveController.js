const Leave = require('../models/Leave');
const Student = require('../models/Student');
const v = require('../utils/validate');
const { AppError, asyncHandler } = require('../utils/errors');
const { hostelScope, studentAccess } = require('../utils/access');
const { audit } = require('../models/Content');

exports.create = asyncHandler(async (req, res) => {
  const reason = v.str(req.body.reason, 'Reason', { max: 255 });
  const dest = v.str(req.body.destination, 'Destination', { max: 255 });
  const dep = v.dateTime(req.body.departAt, 'Departure');
  const ret = v.dateTime(req.body.returnAt, 'Return');
  if (ret <= dep) throw new AppError(400, 'Return time must be after departure time.');
  if (new Date(ret.replace(' ', 'T')) <= new Date()) throw new AppError(400, 'Return time must be in the future.');
  const id = await Leave.create(req.user.student_id, reason, dep, ret, dest);
  res.status(201).json({ message: 'Leave request submitted.', id });
});

exports.list = asyncHandler(async (req, res) => {
  const q = req.query;
  if (q.status) v.oneOf(q.status, ['Pending', 'Approved', 'Rejected'], 'status');
  const f = { status: q.status, limit: q.limit };
  if (req.user.role === 'student') f.studentId = req.user.student_id;
  else { f.hostel = hostelScope(req); if (q.studentId) f.studentId = v.studentId(q.studentId); }
  res.json({ leaves: await Leave.list(f) });
});

const loadLeave = async (req) => {
  const leave = await Leave.get(v.int(req.params.id, 'Leave id', { min: 1 }));
  if (!leave) throw new AppError(404, 'Leave request not found.');
  await studentAccess(req, leave.student_id);
  return leave;
};

exports.decide = asyncHandler(async (req, res) => {
  const leave = await loadLeave(req);
  const status = v.oneOf(req.body.status, ['Approved', 'Rejected'], 'status');
  if (!(await Leave.decide(leave.id, status, req.user.id))) throw new AppError(409, 'Only pending requests can be decided.');
  await audit(req.user.id, 'LEAVE_' + status.toUpperCase(), `leave ${leave.id} (${leave.student_id})`);
  res.json({ message: `Leave ${status.toLowerCase()}.` });
});

exports.depart = asyncHandler(async (req, res) => {
  const leave = await loadLeave(req);
  if (leave.status !== 'Approved') throw new AppError(409, 'Only approved leave can be marked as departed.');
  await Student.setStatus(leave.student_id, 'On Leave');
  await audit(req.user.id, 'LEAVE_DEPARTED', `leave ${leave.id}`);
  res.json({ message: 'Student marked as on leave.' });
});
