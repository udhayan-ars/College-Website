const r = require('express').Router();
const c = require('../controllers/attendanceController');
const deviceAuth = require('../middleware/deviceAuth');
const { authenticate, authorize } = require('../middleware/auth');
r.post('/events', deviceAuth, c.deviceEvent);                              // hardware devices
r.post('/simulate', authenticate, authorize('admin', 'warden'), c.simulate); // portal demo simulator
module.exports = r;
