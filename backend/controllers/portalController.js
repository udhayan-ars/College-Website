const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError, asyncHandler } = require('../utils/errors');
const { cookieOptions } = require('../middleware/portalAuth');

const MEMBERS = Object.freeze({
  udhayan: 'Udhayan',
  yogamithran: 'Yogamithran',
  deepasri: 'Deepasri',
  dhiviya: 'Dhiviya',
});
const sessionHours = () => Math.max(1, Math.min(24, Number(process.env.PORTAL_SESSION_HOURS) || 8));

exports.login = asyncHandler(async (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  const password = req.body.password;
  if (!username || typeof password !== 'string' || !password || password.length > 72) {
    throw new AppError(400, 'Enter a valid username and password.');
  }
  const hash = process.env.PORTAL_PASSWORD_HASH || '';
  const validHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
  const passwordMatches = validHash ? await bcrypt.compare(password, hash) : false;
  if (!Object.prototype.hasOwnProperty.call(MEMBERS, username) || !passwordMatches) {
    throw new AppError(401, 'Incorrect username or password.');
  }
  const fullName = MEMBERS[username];
  const token = jwt.sign({ sub: username, name: fullName, purpose: 'nexora-portal' }, process.env.JWT_SECRET, {
    algorithm: 'HS256', expiresIn: `${sessionHours()}h`,
  });
  res.cookie('nexora_portal', token, { ...cookieOptions(), maxAge: sessionHours() * 3600 * 1000 });
  res.json({ message: 'Portal sign-in successful.', user: { username, fullName } });
});

exports.me = (req, res) => res.json({ user: req.portalUser });

exports.logout = (req, res) => {
  res.clearCookie('nexora_portal', cookieOptions());
  res.json({ message: 'Signed out.' });
};
