
from datetime import datetime, timezone
from ..extensions import db


def utc_now():
    return datetime.now(timezone.utc)


class AcademicYear(db.Model):
    __tablename__ = "academic_years"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20), unique=True, nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    active = db.Column(db.Boolean, default=False, nullable=False)


class Semester(db.Model):
    __tablename__ = "semesters"

    id = db.Column(db.Integer, primary_key=True)
    academic_year_id = db.Column(
        db.Integer, db.ForeignKey("academic_years.id"), nullable=False
    )
    number = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(40), nullable=False)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    active = db.Column(db.Boolean, default=False, nullable=False)

    academic_year = db.relationship("AcademicYear")

    __table_args__ = (
        db.UniqueConstraint(
            "academic_year_id", "number",
            name="uq_semester_year_number"
        ),
    )


class Subject(db.Model):
    __tablename__ = "subjects"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)
    department = db.Column(db.String(80), nullable=False)
    semester_id = db.Column(
        db.Integer, db.ForeignKey("semesters.id"), nullable=False
    )
    course_id = db.Column(db.Integer, db.ForeignKey("course.id"))
    credits = db.Column(db.Float, default=3.0)
    max_internal_marks = db.Column(db.Float, default=100.0)
    max_external_marks = db.Column(db.Float, default=100.0)
    active = db.Column(db.Boolean, default=True, nullable=False)

    semester = db.relationship("Semester")
    course = db.relationship("Course")


class FacultySubject(db.Model):
    __tablename__ = "faculty_subjects"

    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=False
    )
    subject_id = db.Column(
        db.Integer, db.ForeignKey("subjects.id"), nullable=False
    )
    academic_year_id = db.Column(
        db.Integer, db.ForeignKey("academic_years.id"), nullable=False
    )

    faculty = db.relationship("User")
    subject = db.relationship("Subject")
    academic_year = db.relationship("AcademicYear")

    __table_args__ = (
        db.UniqueConstraint(
            "faculty_id", "subject_id", "academic_year_id",
            name="uq_faculty_subject_year"
        ),
    )


class Attendance(db.Model):
    __tablename__ = "attendance"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=False, index=True
    )
    subject_id = db.Column(
        db.Integer, db.ForeignKey("subjects.id"), nullable=False
    )
    faculty_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=False
    )
    attendance_date = db.Column(db.Date, nullable=False, index=True)
    period_number = db.Column(db.Integer, default=1)
    status = db.Column(db.String(15), nullable=False)
    remarks = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=utc_now)

    student = db.relationship("User", foreign_keys=[student_id])
    faculty = db.relationship("User", foreign_keys=[faculty_id])
    subject = db.relationship("Subject")

    __table_args__ = (
        db.UniqueConstraint(
            "student_id", "subject_id", "attendance_date", "period_number",
            name="uq_student_subject_attendance"
        ),
        db.CheckConstraint(
            "status IN ('Present', 'Absent', 'OD', 'Leave')",
            name="ck_attendance_status"
        ),
    )


class InternalMark(db.Model):
    __tablename__ = "internal_marks"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=False, index=True
    )
    subject_id = db.Column(
        db.Integer, db.ForeignKey("subjects.id"), nullable=False
    )
    faculty_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=False
    )
    assessment_type = db.Column(db.String(30), nullable=False)
    marks_obtained = db.Column(db.Float, nullable=False)
    maximum_marks = db.Column(db.Float, nullable=False, default=100.0)
    remarks = db.Column(db.String(255))
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    student = db.relationship("User", foreign_keys=[student_id])
    faculty = db.relationship("User", foreign_keys=[faculty_id])
    subject = db.relationship("Subject")

    __table_args__ = (
        db.UniqueConstraint(
            "student_id", "subject_id", "assessment_type",
            name="uq_student_subject_assessment"
        ),
        db.CheckConstraint(
            "marks_obtained >= 0 AND maximum_marks > 0 "
            "AND marks_obtained <= maximum_marks",
            name="ck_internal_marks_range"
        ),
    )


class ExamSchedule(db.Model):
    __tablename__ = "exam_schedules"

    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(
        db.Integer, db.ForeignKey("subjects.id"), nullable=False
    )
    semester_id = db.Column(
        db.Integer, db.ForeignKey("semesters.id"), nullable=False
    )
    exam_type = db.Column(db.String(30), nullable=False)
    exam_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    room = db.Column(db.String(50))
    instructions = db.Column(db.Text)
    published = db.Column(db.Boolean, default=False, nullable=False)

    subject = db.relationship("Subject")
    semester = db.relationship("Semester")


class HallTicket(db.Model):
    __tablename__ = "hall_tickets"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=False
    )
    semester_id = db.Column(
        db.Integer, db.ForeignKey("semesters.id"), nullable=False
    )
    exam_type = db.Column(db.String(30), nullable=False)
    hall_ticket_number = db.Column(
        db.String(40), unique=True, nullable=False
    )
    eligible = db.Column(db.Boolean, default=False, nullable=False)
    issued = db.Column(db.Boolean, default=False, nullable=False)
    issued_at = db.Column(db.DateTime)

    student = db.relationship("User")
    semester = db.relationship("Semester")

    __table_args__ = (
        db.UniqueConstraint(
            "student_id", "semester_id", "exam_type",
            name="uq_student_semester_hallticket"
        ),
    )

class SemesterResult(db.Model):
    __tablename__ = "semester_results"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    semester_id = db.Column(db.Integer, db.ForeignKey("semesters.id"), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=False)
    internal_marks = db.Column(db.Float, default=0, nullable=False)
    external_marks = db.Column(db.Float, default=0, nullable=False)
    total_marks = db.Column(db.Float, default=0, nullable=False)
    grade = db.Column(db.String(5))
    grade_points = db.Column(db.Float, default=0)
    credits = db.Column(db.Float, default=0)
    published = db.Column(db.Boolean, default=False, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    student = db.relationship("User")
    semester = db.relationship("Semester")
    subject = db.relationship("Subject")

    __table_args__ = (
        db.UniqueConstraint(
            "student_id", "semester_id", "subject_id",
            name="uq_student_semester_subject_result"
        ),
    )


class StudentFee(db.Model):
    __tablename__ = "student_fees"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    fee_type = db.Column(db.String(40), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    due_date = db.Column(db.Date)
    status = db.Column(db.String(20), default="Pending", nullable=False)
    payment_reference = db.Column(db.String(50), unique=True)
    payment_mode = db.Column(db.String(20), default="DEMO")
    paid_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utc_now)

    student = db.relationship("User")


class LeaveApplication(db.Model):
    __tablename__ = "leave_applications"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    from_date = db.Column(db.Date, nullable=False)
    to_date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="Pending", nullable=False)
    reviewed_by = db.Column(db.Integer, db.ForeignKey("user.id"))
    reviewer_note = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=utc_now)

    student = db.relationship("User", foreign_keys=[student_id])
    reviewer = db.relationship("User", foreign_keys=[reviewed_by])


class Scholarship(db.Model):
    __tablename__ = "scholarships"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    eligibility = db.Column(db.Text)
    amount = db.Column(db.Float, default=0)
    active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now)


class ScholarshipApplication(db.Model):
    __tablename__ = "scholarship_applications"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    scholarship_id = db.Column(db.Integer, db.ForeignKey("scholarships.id"), nullable=False)
    reason = db.Column(db.Text)
    status = db.Column(db.String(20), default="Pending", nullable=False)
    applied_at = db.Column(db.DateTime, default=utc_now)

    student = db.relationship("User")
    scholarship = db.relationship("Scholarship")

    __table_args__ = (
        db.UniqueConstraint("student_id", "scholarship_id", name="uq_student_scholarship"),
    )


class CertificateRequest(db.Model):
    __tablename__ = "certificate_requests"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    certificate_type = db.Column(db.String(80), nullable=False)
    purpose = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(20), default="Pending", nullable=False)
    admin_note = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=utc_now)

    student = db.relationship("User")


class Grievance(db.Model):
    __tablename__ = "grievances"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    category = db.Column(db.String(60), nullable=False)
    subject = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="Open", nullable=False)
    response = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)

    student = db.relationship("User")


class LibraryBook(db.Model):
    __tablename__ = "library_books"

    id = db.Column(db.Integer, primary_key=True)
    accession_number = db.Column(db.String(40), unique=True, nullable=False)
    title = db.Column(db.String(180), nullable=False)
    author = db.Column(db.String(120))
    category = db.Column(db.String(80))
    total_copies = db.Column(db.Integer, default=1, nullable=False)
    available_copies = db.Column(db.Integer, default=1, nullable=False)
    active = db.Column(db.Boolean, default=True, nullable=False)


class LibraryLoan(db.Model):
    __tablename__ = "library_loans"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    book_id = db.Column(db.Integer, db.ForeignKey("library_books.id"), nullable=False)
    issue_date = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    return_date = db.Column(db.Date)
    status = db.Column(db.String(20), default="Issued", nullable=False)

    student = db.relationship("User")
    book = db.relationship("LibraryBook")

