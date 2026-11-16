const bcrypt = require('bcryptjs');
const db = require('../config/database');
const Student = require('../models/Student');
const User = require('../models/User');
const Room = require('../models/Room');
const v = require('../utils/validate');
const { AppError, asyncHandler } = require('../utils/errors');
const { hostelScope, studentAccess } = require('../utils/access');
const { audit } = require('../models/Content');

const STATUSES = ['Inside', 'College', 'On Leave', 'Home', 'Absent'];

exports.list = asyncHandler(async (req, res) => {
  const q = req.query;
  if (q.status) v.oneOf(q.status, STATUSES, 'status');
  if (q.year) v.oneOf(q.year, v.YEARS, 'year');
  const { rows, total } = await Student.list({
    hostel: hostelScope(req), dept: q.dept, year: q.year, status: q.status, roomNo: q.roomNo,
    search: q.search, limit: q.limit, offset: q.offset, archived: req.user.role === 'admin' && q.archived === 'true'
  });
  res.json({ total, students: rows });
});

exports.get = asyncHandler(async (req, res) => res.json({ student: await studentAccess(req, req.params.id.toUpperCase()) }));

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const s = {
    id: v.studentId(b.id), name: v.str(b.name, 'Name', { max: 100 }), gender: v.oneOf(b.gender, v.HOSTELS, 'Gender'),
    dept: v.str(b.dept, 'Department', { max: 50 }), year: v.oneOf(b.year, v.YEARS, 'Year'), phone: v.phone(b.phone, 'Mobile'),
    email: v.email(b.email, 'Email'), parent: v.str(b.parent, 'Parent/guardian info', { max: 255 }),
    emergencyContact: v.phone(b.emergencyContact, 'Emergency contact', true)
  };
  if (req.user.role === 'warden' && s.gender !== req.user.hostel) throw new AppError(403, 'You can only add students to your own hostel.');
  const roomId = v.int(b.roomId, 'Room id', { min: 1, optional: true });
  const hash = await bcrypt.hash(v.password(b.password, 'Initial password'), 12);
  await db.withTx(async c => {
    await Student.create(c, s);
    await User.create({ username: s.id, hash, role: 'student', fullName: s.name, hostel: s.gender, studentId: s.id }, c);
    if (roomId) await Room.allocate(c, s.id, roomId);
  });
  await audit(req.user.id, 'STUDENT_CREATE', s.id);
  res.status(201).json({ message: 'Student created.', student: await Student.get(s.id) });
});

exports.update = asyncHandler(async (req, res) => {
  const id = req.params.id.toUpperCase();
  await studentAccess(req, id);
  const b = req.body, f = {};
  if (b.name !== undefined) f.name = v.str(b.name, 'Name', { max: 100 });
  if (b.dept !== undefined) f.dept = v.str(b.dept, 'Department', { max: 50 });
  if (b.year !== undefined) f.year_of_study = v.oneOf(b.year, v.YEARS, 'Year');
  if (b.phone !== undefined) f.phone = v.phone(b.phone, 'Mobile');
  if (b.email !== undefined) f.email = v.email(b.email, 'Email');
  if (b.parent !== undefined) f.parent_info = v.str(b.parent, 'Parent/guardian info', { max: 255 });
  if (b.emergencyContact !== undefined) f.emergency_contact = v.phone(b.emergencyContact, 'Emergency contact', true);
  if (!Object.keys(f).length) throw new AppError(400, 'No updatable fields supplied.');
  await db.withTx(async c => {
    await Student.update(id, f, c);
    if (f.name) await c.query('UPDATE users SET full_name=? WHERE student_id=?', [f.name, id]);
  });
  await audit(req.user.id, 'STUDENT_UPDATE', id);
  res.json({ message: 'Student updated.', student: await Student.get(id) });
});

// Default: archive (soft delete, keeps protected biometric history). ?permanent=true (admin) removes the row if allowed.
exports.remove = asyncHandler(async (req, res) => {
  const id = req.params.id.toUpperCase();
  await studentAccess(req, id);
  if (req.query.permanent === 'true') {
    if (req.user.role !== 'admin') throw new AppError(403, 'Only the admin can permanently delete a student.');
    await Student.hardDelete(id);
    await audit(req.user.id, 'STUDENT_DELETE', id);
    return res.json({ message: 'Student permanently deleted.' });
  }
  await db.withTx(c => Student.archive(c, id));
  await audit(req.user.id, 'STUDENT_ARCHIVE', id);
  res.json({ message: 'Student archived and room released.' });
});

// Staff-only student account recovery
exports.getAccount = asyncHandler(async (req, res) => {
  const id = req.params.id.toUpperCase();
  const student = await studentAccess(req, id);

  const [rows] = await db.query(
    'SELECT id, username, role, student_id, is_active FROM users WHERE student_id=? AND role=? LIMIT 1',
    [student.id, 'student']
  );

  const account = rows[0];
  if (!account) throw new AppError(404, 'Student account not found.');

  res.json({
    account: {
      username: account.username,
      active: Boolean(account.is_active),
      studentId: account.student_id
    }
  });
});

exports.resetStudentPassword = asyncHandler(async (req, res) => {
  const id = req.params.id.toUpperCase();
  const student = await studentAccess(req, id);
  const password = v.password(req.body.newPassword, 'New password');

  const [rows] = await db.query(
    'SELECT id, is_active FROM users WHERE student_id=? AND role=? LIMIT 1',
    [student.id, 'student']
  );

  const account = rows[0];
  if (!account || !account.is_active) {
    throw new AppError(404, 'Active student account not found.');
  }

  const hash = await bcrypt.hash(password, 12);
  await User.update(account.id, { password_hash: hash });

  await audit(req.user.id, 'STUDENT_PASSWORD_RESET', student.id);

  res.json({ message: 'Student password reset successfully. Ask the student to change it after login.' });
});
