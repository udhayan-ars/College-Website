const r = require('express').Router();
const c = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');
r.use(authenticate);
r.get('/me', authorize('student'), c.me);
r.get('/events', authorize('admin', 'warden', 'staff'), c.events);
r.get('/daily', authorize('admin', 'warden', 'staff'), c.daily);
r.get('/report', authorize('admin', 'warden', 'staff'), c.report);
module.exports = r;
