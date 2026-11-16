const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
});

exports.cookieOptions = cookieOptions;
exports.authenticatePortal = (req, res, next) => {
  try {
    const token = req.cookies && req.cookies.nexora_portal;
    if (!token) throw new AppError(401, 'Portal sign-in required.');
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.purpose !== 'nexora-portal' || !payload.sub) throw new AppError(401, 'Invalid portal session.');
    req.portalUser = { username: payload.sub, fullName: payload.name || payload.sub };
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, 'Portal session expired. Please sign in again.'));
  }
};
