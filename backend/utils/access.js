const { AppError } = require('./errors');
const Student = require('../models/Student');

// Hostel filter for the caller: wardens/staff are locked to their hostel, admin may choose.
exports.hostelScope = req => {
  const u = req.user;
  if (u.role === 'admin') {
    const h = req.query.hostel;
    if (h && !['Boys', 'Girls'].includes(h)) throw new AppError(400, 'hostel must be Boys or Girls.');
    return h || null;
  }
  return u.hostel;
};

exports.assertHostel = (req, hostel) => {
  const u = req.user;
  if ((u.role === 'warden' || u.role === 'staff') && u.hostel !== hostel) throw new AppError(403, 'This record belongs to another hostel.');
};

// Loads a student and verifies the caller may access that student.
exports.studentAccess = async (req, id) => {
  const s = await Student.get(id);
  if (!s || !s.is_active) throw new AppError(404, 'Student not found.');
  const u = req.user;
  if (u.role === 'student' && u.student_id !== s.id) throw new AppError(403, 'You can only access your own records.');
  if ((u.role === 'warden' || u.role === 'staff') && u.hostel !== s.gender) throw new AppError(403, 'This student belongs to another hostel.');
  return s;
};
