const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/portalController');
const { authenticatePortal } = require('../middleware/portalAuth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Please try again later.' },
});

router.post('/login', loginLimiter, controller.login);
router.get('/me', authenticatePortal, controller.me);
router.post('/logout', authenticatePortal, controller.logout);
module.exports = router;
