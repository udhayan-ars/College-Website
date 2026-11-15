const Emergency = require('../models/Emergency');
const v = require('../utils/validate');
const { AppError, asyncHandler } = require('../utils/errors');
const { hostelScope, studentAccess } = require('../utils/access');
const { audit } = require('../models/Content');

const NEXT = { Pending: ['Approved', 'Rejected'], Approved: ['Returned'] };

exports.create = asyncHandler(async (req, res) => {
  const category = v.oneOf(req.body.category, v.EMERGENCY_CATEGORIES, 'Category');
  const reason = v.str(req.body.reason, 'Reason', { max: 255 });
  const dest = v.str(req.body.destination, 'Destination', { max: 255 });
  const ret = v.dateTime(req.body.expectedReturn, 'Expected return');
  const id = await Emergency.create(req.user.student_id, category, reason, dest, ret);
  await audit(req.user.id, 'EMERGENCY_REQUEST', `emergency ${id}`);
  res.status(201).json({ message: 'Emergency request sent to the warden.', id });
});

exports.list = asyncHandler(async (req, res) => {
  const q = req.query;
  if (q.status) v.oneOf(q.status, ['Pending', 'Approved', 'Rejected', 'Returned'], 'status');
  const f = { status: q.status, limit: q.limit };
  if (req.user.role === 'student') f.studentId = req.user.student_id;
  else f.hostel = hostelScope(req);
  res.json({ emergencies: await Emergency.list(f) });
});

exports.update = asyncHandler(async (req, res) => {
  const e = await Emergency.get(v.int(req.params.id, 'Emergency id', { min: 1 }));
  if (!e) throw new AppError(404, 'Emergency request not found.');
  await studentAccess(req, e.student_id);
  const status = v.oneOf(req.body.status, ['Approved', 'Rejected', 'Returned'], 'status');
  if (!(NEXT[e.status] || []).includes(status)) throw new AppError(409, `Cannot change an emergency from ${e.status} to ${status}.`);
  await Emergency.setStatus(e.id, status);
  await audit(req.user.id, 'EMERGENCY_' + status.toUpperCase(), `emergency ${e.id}`);
  res.json({ message: `Emergency marked ${status}.` });
});
