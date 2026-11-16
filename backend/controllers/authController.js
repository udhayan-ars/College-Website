const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const v = require('../utils/validate');
const { AppError, asyncHandler } = require('../utils/errors');
const { audit } = require('../models/Content');

const DUMMY_HASH = bcrypt.hashSync('timing-protection-dummy', 12);
const hours = () => Number(process.env.JWT_EXPIRES_HOURS) || 8;
const cookieOpts = () => ({ httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });
const publicUser = u => ({ id: u.id, username: u.username, role: u.role, fullName: u.full_name, hostel: u.hostel, studentId: u.student_id });

exports.login = asyncHandler(async (req, res) => {
  const username = v.str(req.body.username, 'Username', { max: 50 });
  const password = req.body.password;
  if (typeof password !== 'string' || !password || password.length > 72) throw new AppError(400, 'Password is required.');
  const user = await User.findByUsername(username);
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok || !user.is_active) throw new AppError(401, 'Invalid username or password.');
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: `${hours()}h` });
  res.cookie('token', token, { ...cookieOpts(), maxAge: hours() * 3600 * 1000 });
  await audit(user.id, 'LOGIN', null);
  res.json({ message: 'Login successful.', user: publicUser(user) });
});

exports.me = (req, res) => res.json({ user: publicUser(req.user) });

exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', cookieOpts());
  await audit(req.user.id, 'LOGOUT', null);
  res.json({ message: 'Logged out.' });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const current = req.body.currentPassword;
  if (typeof current !== 'string' || !(await bcrypt.compare(current, user.password_hash))) throw new AppError(400, 'Current password is incorrect.');
  const next = v.password(req.body.newPassword, 'New password');
  await User.update(user.id, { password_hash: await bcrypt.hash(next, 12) });
  await audit(user.id, 'PASSWORD_CHANGE', null);
  res.json({ message: 'Password changed.' });
});
