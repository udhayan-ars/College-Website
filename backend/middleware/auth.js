const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../utils/errors');

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies.token;
    if (!token) throw new AppError(401, 'Authentication required.');
    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
    catch (e) { throw new AppError(401, 'Session expired. Please log in again.'); }
    const user = await User.findById(payload.sub);
    if (!user || !user.is_active) throw new AppError(401, 'Account is not active.');
    req.user = user;
    next();
  } catch (e) { next(e); }
};

exports.authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new AppError(403, 'You do not have permission to perform this action.'));
