const { AppError } = require('./errors');
const bad = m => { throw new AppError(400, m); };
const empty = v => v === undefined || v === null || v === '';

exports.str = (v, name, { min = 1, max = 255, optional = false } = {}) => {
  if (empty(v)) { if (optional) return null; bad(`${name} is required.`); }
  if (typeof v !== 'string') bad(`${name} must be text.`);
  const t = v.trim();
  if (t.length < min || t.length > max) bad(`${name} must be ${min}-${max} characters.`);
  return t;
};
exports.oneOf = (v, list, name, optional = false) => {
  if (empty(v) && optional) return null;
  if (!list.includes(v)) bad(`${name} must be one of: ${list.join(', ')}.`);
  return v;
};
exports.int = (v, name, { min = 0, max = 1e9, optional = false } = {}) => {
  if (empty(v)) {
    if (optional) return null;
    bad(`${name} is required.`);
  }
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) bad(`${name} must be a whole number between ${min} and ${max}.`);
  return n;
};
exports.dateTime = (v, name) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(v.trim())) bad(`${name} must be a valid date and time (YYYY-MM-DDTHH:mm).`);
  let s = v.trim().replace('T', ' ');
  if (s.length === 16) s += ':00';
  if (isNaN(new Date(s.replace(' ', 'T')))) bad(`${name} is not a valid date and time.`);
  return s;
};
exports.date = (v, name) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) bad(`${name} must be a valid date (YYYY-MM-DD).`);
  const [year, month, day] = v.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    bad(`${name} must be a valid date (YYYY-MM-DD).`);
  }
  return v;
};
exports.phone = (v, name, optional = false) => {
  const s = exports.str(v, name, { max: 20, optional });
  if (s && !/^[0-9+\-\s]{7,20}$/.test(s)) bad(`${name} is not a valid phone number.`);
  return s;
};
exports.email = (v, name, optional = true) => {
  const s = exports.str(v, name, { max: 120, optional });
  if (s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) bad(`${name} is not a valid email address.`);
  return s;
};
exports.studentId = v => {
  const s = exports.str(v, 'Student ID', { max: 20 }).toUpperCase();
  if (!/^[A-Z0-9_-]{2,20}$/.test(s)) bad('Student ID may contain only letters, digits, - and _.');
  return s;
};
exports.password = (v, name = 'Password') => {
  if (typeof v !== 'string' || v.length < 8 || v.length > 72 || !/[A-Za-z]/.test(v) || !/\d/.test(v)) bad(`${name} must be 8-72 characters with at least one letter and one digit.`);
  return v;
};
const pad = n => String(n).padStart(2, '0');
exports.today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
exports.HOSTELS = ['Boys', 'Girls'];
exports.YEARS = ['1st', '2nd', '3rd', '4th'];
exports.COMPLAINT_CATEGORIES = ['Food quality', 'Drinking water', 'Room maintenance', 'Electricity', 'Bathroom & cleanliness', 'Wi-Fi', 'Furniture', 'Security', 'Other'];
exports.EMERGENCY_CATEGORIES = ['Medical emergency', 'Hospital visit', 'Family emergency', 'Personal emergency', 'Unexpected travel home'];
