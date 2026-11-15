const r = require('express').Router();
const c = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many login attempts. Try again in 15 minutes.' } });

r.post('/login', loginLimiter, c.login);
r.get('/me', authenticate, c.me);
r.post('/logout', authenticate, c.logout);
r.post('/change-password', authenticate, c.changePassword);
module.exports = r;
