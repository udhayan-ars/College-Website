const Complaint = require('../models/Complaint');
const v = require('../utils/validate');
const { AppError, asyncHandler } = require('../utils/errors');
const { hostelScope, studentAccess } = require('../utils/access');
const { audit } = require('../models/Content');

const STATUSES = ['Pending', 'In Progress', 'Resolved'];

exports.create = asyncHandler(async (req, res) => {
  const category = v.oneOf(req.body.category, v.COMPLAINT_CATEGORIES, 'Category');
  const description = v.str(req.body.description, 'Description', { max: 1000 });
  const id = await Complaint.create(req.user.student_id, category, description);
  res.status(201).json({ message: 'Complaint submitted.', id });
});

exports.list = asyncHandler(async (req, res) => {
  const q = req.query;
  if (q.status) v.oneOf(q.status, STATUSES, 'status');
  const f = { status: q.status, limit: q.limit };
  if (req.user.role === 'student') f.studentId = req.user.student_id;
  else f.hostel = hostelScope(req);
  res.json({ complaints: await Complaint.list(f) });
});

exports.update = asyncHandler(async (req, res) => {
  const c = await Complaint.get(v.int(req.params.id, 'Complaint id', { min: 1 }));
  if (!c) throw new AppError(404, 'Complaint not found.');
  await studentAccess(req, c.student_id);
  const status = v.oneOf(req.body.status, STATUSES, 'status');
  await Complaint.setStatus(c.id, status);
  await audit(req.user.id, 'COMPLAINT_UPDATE', `complaint ${c.id} -> ${status}`);
  res.json({ message: 'Complaint updated.' });
});
