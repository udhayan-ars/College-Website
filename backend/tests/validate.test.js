const test = require('node:test');
const assert = require('node:assert/strict');

const v = require('../utils/validate');
const { AppError } = require('../utils/errors');

test('String validation', () => {
  assert.equal(v.str(' Udhayan ', 'Name'), 'Udhayan');
  assert.throws(() => v.str('', 'Name'), AppError);
  assert.throws(() => v.str(123, 'Name'), AppError);
});

test('Optional string validation', () => {
  assert.equal(v.str('', 'Name', { optional: true }), null);
});

test('Email validation', () => {
  assert.equal(v.email('test@example.com', 'Email'), 'test@example.com');
  assert.throws(() => v.email('invalid-email', 'Email'), AppError);
});

test('Phone validation', () => {
  assert.equal(v.phone('9876543210', 'Phone'), '9876543210');
  assert.throws(() => v.phone('abc123', 'Phone'), AppError);
});

test('Password validation', () => {
  assert.equal(v.password('Secure123'), 'Secure123');
  assert.throws(() => v.password('12345'), AppError);
});

test('Student ID validation', () => {
  assert.equal(v.studentId('e23cy003'), 'E23CY003');
  assert.throws(() => v.studentId('@@invalid'), AppError);
});

test('Integer validation', () => {
  assert.equal(v.int('25', 'Age'), 25);
  assert.throws(() => v.int('abc', 'Age'), AppError);
});

test('Date validation', () => {
  assert.equal(v.date('2026-11-16', 'Date'), '2026-11-16');
  assert.throws(() => v.date('invalid-date', 'Date'), AppError);
});

test('Required integer must reject empty values', () => {
  assert.throws(() => v.int('', 'Age'), AppError);
});

test('Date validation must reject impossible calendar dates', () => {
  assert.throws(() => v.date('2026-02-31', 'Date'), AppError);
});
