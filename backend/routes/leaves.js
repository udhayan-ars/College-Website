const r = require('express').Router();
const c = require('../controllers/leaveController');
const { authenticate, authorize } = require('../middleware/auth');
r.use(authenticate);
r.post('/', authorize('student'), c.create);
r.get('/', c.list);
r.patch('/:id/decision', authorize('admin', 'warden'), c.decide);
r.post('/:id/depart', authorize('admin', 'warden'), c.depart);
module.exports = r;
