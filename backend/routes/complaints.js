const r = require('express').Router();
const c = require('../controllers/complaintController');
const { authenticate, authorize } = require('../middleware/auth');
r.use(authenticate);
r.post('/', authorize('student'), c.create);
r.get('/', c.list);
r.patch('/:id', authorize('admin', 'warden', 'staff'), c.update);
module.exports = r;
