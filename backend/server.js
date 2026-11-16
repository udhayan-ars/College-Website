require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const pool = require('./config/database');
const { notFound, errorHandler } = require('./middleware/error');

// Fail fast on missing secrets
const missing = [];
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) missing.push('JWT_SECRET (32+ characters)');
if (!process.env.DEVICE_API_KEY || process.env.DEVICE_API_KEY.length < 16) missing.push('DEVICE_API_KEY (16+ characters)');
for (const k of ['DB_USER', 'DB_NAME']) if (!process.env[k]) missing.push(k);
if (missing.length) { console.error('Invalid .env configuration. Missing/weak: ' + missing.join(', ')); process.exit(1); }

const prod = process.env.NODE_ENV === 'production';
const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'script-src': ["'self'"],
      'script-src-attr': ["'unsafe-inline'"], // the existing frontend uses inline onclick/onchange attributes
      'upgrade-insecure-requests': prod ? [] : null
    }
  }
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many requests. Slow down.' } }));

app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
  catch (e) { res.status(503).json({ status: 'error', database: 'unreachable' }); }
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/portal', require('./routes/portal'));
app.use('/api/users', require('./routes/users'));
app.use('/api/students', require('./routes/students'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/biometric', require('./routes/biometric'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/emergencies', require('./routes/emergencies'));
app.use('/api', require('./routes/content'));
app.use('/api', notFound);

// The institution portal is the entry point. Existing workspaces remain separate.
const portalAuth = require('./middleware/portalAuth').authenticatePortal;
const projectRoot = path.join(__dirname, '..');
app.use('/hostel', express.static(path.join(__dirname, '..', 'frontend', 'hostel')));
app.use('/admission', portalAuth, express.static(path.join(projectRoot, 'admission')));
app.use('/modules/campustrack', portalAuth, express.static(path.join(projectRoot, 'modules', 'campustrack')));
app.use('/modules/canteen_management', portalAuth, express.static(path.join(projectRoot, 'modules', 'canteen_management')));
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;
pool.query('SELECT 1').then(() => {
  app.listen(port, () => console.log(`NEXORA Portal running at http://localhost:${port}`));
}).catch(e => { console.error('Database connection failed:', e.message); process.exit(1); });
