const crypto = require('crypto');
const { AppError } = require('../utils/errors');

// Biometric devices authenticate with a shared secret in the x-device-key header.
module.exports = (req, res, next) => {
  const given = Buffer.from(String(req.headers['x-device-key'] || ''));
  const expected = Buffer.from(process.env.DEVICE_API_KEY || '');
  if (!expected.length || given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return next(new AppError(401, 'Invalid device key.'));
  }
  next();
};
