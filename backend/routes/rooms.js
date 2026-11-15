const r = require('express').Router();
const c = require('../controllers/roomController');
const { authenticate, authorize } = require('../middleware/auth');
r.use(authenticate);
r.get('/', authorize('admin', 'warden', 'staff'), c.list);
r.post('/', authorize('admin', 'warden'), c.create);
r.post('/allocate', authorize('admin', 'warden'), c.allocate);
r.post('/checkout', authorize('admin', 'warden'), c.checkout);
r.get('/history/:studentId', c.history);
r.route('/:id')
  .get(authorize('admin', 'warden', 'staff'), c.get)
  .patch(authorize('admin', 'warden'), c.update)
  .delete(authorize('admin'), c.remove);
module.exports = r;
