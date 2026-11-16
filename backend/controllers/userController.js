const bcrypt = require('bcryptjs');
const User = require('../models/User');
const v = require('../utils/validate');
const { AppError, asyncHandler } = require('../utils/errors');
const { audit } = require('../models/Content');

exports.list = asyncHandler(async (req, res) => res.json({ users: await User.list() }));

// Creates admin, warden or staff accounts (student accounts are created with the student).
exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const username = v.str(b.username, 'Username', { min: 3, max: 50 });
  if (!/^[A-Za-z0-9_.-]+$/.test(username)) throw new AppError(400, 'Username may contain letters, digits, . _ - only.');
  const role = v.oneOf(b.role, ['admin', 'warden', 'staff'], 'Role');
  const fullName = v.str(b.fullName, 'Full name', { max: 100 });
  const hostel = role === 'admin' ? null : v.oneOf(b.hostel, v.HOSTELS, 'Hostel');
  const hash = await bcrypt.hash(v.password(b.password), 12);
  const id = await User.create({ username, hash, role, fullName, hostel });
  await audit(req.user.id, 'USER_CREATE', `${role} ${username}`);
  res.status(201).json({ message: 'User created.', id });
});

exports.update = asyncHandler(async (req, res) => {
  const id = v.int(req.params.id, 'User id', { min: 1 });
  const target = await User.findById(id);
  if (!target) throw new AppError(404, 'User not found.');
  const fields = {};
  if (req.body.isActive !== undefined) {
    if (id === req.user.id) throw new AppError(400, 'You cannot deactivate your own account.');
    fields.is_active = req.body.isActive ? 1 : 0;
  }
  if (req.body.password !== undefined) fields.password_hash = await bcrypt.hash(v.password(req.body.password), 12);
  if (!Object.keys(fields).length) throw new AppError(400, 'Nothing to update (send isActive and/or password).');
  await User.update(id, fields);
  await audit(req.user.id, 'USER_UPDATE', `user ${id}`);
  res.json({ message: 'User updated.' });
});
