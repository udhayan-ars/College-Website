const r = require('express').Router();
const c = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
r.use(authenticate, authorize('admin'));
r.get('/', c.list);
r.post('/', c.create);
r.patch('/:id', c.update);
module.exports = r;
