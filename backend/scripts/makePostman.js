// Regenerates postman_collection.json:  node scripts/makePostman.js
const fs = require('fs'), path = require('path');
const j = o => JSON.stringify(o, null, 2);
const G = [
  ['0 Health', [['GET', '/api/health']]],
  ['1 Auth', [
    ['POST', '/api/auth/login', { username: 'chairman', password: '<ADMIN_PASSWORD>' }, 'Login as admin (cookie is saved automatically)'],
    ['GET', '/api/auth/me'], ['POST', '/api/auth/logout'],
    ['POST', '/api/auth/change-password', { currentPassword: 'old', newPassword: 'NewPass123' }]]],
  ['2 Users (admin)', [
    ['GET', '/api/users'],
    ['POST', '/api/users', { username: 'wb2', password: 'Warden123', role: 'warden', fullName: 'Boys Warden 2', hostel: 'Boys' }],
    ['PATCH', '/api/users/2', { isActive: true }]]],
  ['3 Students', [
    ['GET', '/api/students?hostel=Boys&search=ar&dept=CSE&year=2nd&status=Inside&limit=50&offset=0'],
    ['POST', '/api/students', { id: 'B010', name: 'New Student', gender: 'Boys', dept: 'CSE', year: '1st', phone: '9111111111', email: 'new@college.edu', parent: 'Mr. Parent 9100000010', emergencyContact: '9100000010', password: 'Student123', roomId: 2 }],
    ['GET', '/api/students/B010'],
    ['PUT', '/api/students/B010', { phone: '9222222222', dept: 'ECE' }],
    ['DELETE', '/api/students/B010', null, 'Archive (soft delete)'],
    ['DELETE', '/api/students/B010?permanent=true', null, 'Admin only; blocked if biometric history exists']]],
  ['4 Rooms', [
    ['GET', '/api/rooms?hostel=Boys&available=true'],
    ['POST', '/api/rooms', { roomNo: 'B-201', hostel: 'Boys', floor: 2, capacity: 3 }],
    ['GET', '/api/rooms/1'], ['PATCH', '/api/rooms/1', { capacity: 3 }],
    ['POST', '/api/rooms/allocate', { studentId: 'B002', roomId: 2 }, 'Room check-in / room change'],
    ['POST', '/api/rooms/checkout', { studentId: 'B002' }, 'Room check-out'],
    ['GET', '/api/rooms/history/B002'], ['DELETE', '/api/rooms/1']]],
  ['5 Biometric + Attendance', [
    ['POST', '/api/biometric/events', { studentId: 'B001', eventType: 'EXIT', result: 'SUCCESS', deviceId: 'BIO-B1' }, 'Device endpoint: uses x-device-key header, no login', true],
    ['POST', '/api/biometric/simulate', { studentId: 'B001', event: 'EXIT' }, 'event: ENTRY | EXIT | FAIL'],
    ['GET', '/api/attendance/events?studentId=B001&from=2026-11-01&to=2026-11-30'],
    ['GET', '/api/attendance/daily?date=2026-11-13&hostel=Boys'],
    ['GET', '/api/attendance/report?from=2026-11-01&to=2026-11-30&hostel=Girls'],
    ['GET', '/api/attendance/me', null, 'Login as a student first']]],
  ['6 Leaves', [
    ['POST', '/api/leaves', { reason: 'Family function', departAt: '2026-12-20T08:00', returnAt: '2026-12-23T18:00', destination: 'Erode' }, 'Login as a student'],
    ['GET', '/api/leaves?status=Pending'],
    ['PATCH', '/api/leaves/1/decision', { status: 'Approved' }, 'Admin or warden'],
    ['POST', '/api/leaves/1/depart']]],
  ['7 Complaints', [
    ['POST', '/api/complaints', { category: 'Wi-Fi', description: 'Internet is very slow in room B-101' }],
    ['GET', '/api/complaints'], ['PATCH', '/api/complaints/1', { status: 'In Progress' }]]],
  ['8 Emergencies', [
    ['POST', '/api/emergencies', { category: 'Medical emergency', reason: 'High fever', destination: 'City Hospital', expectedReturn: '2026-12-20T20:00' }],
    ['GET', '/api/emergencies'], ['PATCH', '/api/emergencies/1', { status: 'Approved' }, 'Pending -> Approved/Rejected, Approved -> Returned']]],
  ['9 Content + Dashboard', [
    ['GET', '/api/notices'], ['POST', '/api/notices', { message: 'Hostel meeting at 6 PM' }],
    ['GET', '/api/mess-menu'], ['PUT', '/api/mess-menu', { Lunch: { items: 'Rice, Sambar, Poriyal', time: '12:30 - 2:00' } }],
    ['GET', '/api/rules'], ['GET', '/api/dashboard?hostel=Boys'], ['GET', '/api/bootstrap']]]
];
const item = ([m, p, body, desc, device]) => {
  const headers = [];
  if (body) headers.push({ key: 'Content-Type', value: 'application/json' });
  if (device) headers.push({ key: 'x-device-key', value: '{{deviceKey}}' });
  const [pathPart, qs] = p.split('?');
  return { name: `${m} ${p}`, request: { method: m, header: headers, description: desc || '',
    body: body ? { mode: 'raw', raw: j(body) } : undefined,
    url: { raw: '{{baseUrl}}' + p, host: ['{{baseUrl}}'], path: pathPart.split('/').filter(Boolean),
      query: qs ? qs.split('&').map(x => ({ key: x.split('=')[0], value: x.split('=')[1] })) : undefined } } };
};
const col = { info: { name: 'Smart Hostel API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  variable: [{ key: 'baseUrl', value: 'http://localhost:3000' }, { key: 'deviceKey', value: '<DEVICE_API_KEY from .env>' }],
  item: G.map(([name, items]) => ({ name, item: items.map(item) })) };
fs.writeFileSync(path.join(__dirname, '..', 'postman_collection.json'), j(col));
console.log('postman_collection.json written');
