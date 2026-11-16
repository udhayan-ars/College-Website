const r = require('express').Router();
const c = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/auth');
r.use(authenticate);
r.get('/', authorize('admin', 'warden', 'staff'), c.list);
r.post('/', authorize('admin', 'warden'), c.create);
r.get('/:id/account', authorize('admin', 'warden'), c.getAccount);
r.patch('/:id/account/password', authorize('admin', 'warden'), c.resetStudentPassword);
r.route('/:id')
  .get(c.get)
  .put(authorize('admin', 'warden'), c.update)
  .patch(authorize('admin', 'warden'), c.update)
  .delete(authorize('admin'), c.remove);
module.exports = r;
