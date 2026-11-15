
import os,uuid
from datetime import datetime
from flask import Blueprint,request,current_app,send_file
from ..utils import *
bp=Blueprint("student",__name__,url_prefix="/api/student")
DOCS=["10th Marksheet","12th Marksheet","Transfer Certificate","Community Certificate","Photograph","Government ID"]
def myapp(): return Application.query.filter_by(applicant_id=cur().id).first()
def ser(a):
    return {"app_no":a.app_no,"status":a.status,"course_id":a.course_id,"details":a.details,"percentage":a.percentage,
     "remarks":a.remarks,"submitted_at":a.submitted_at and a.submitted_at.isoformat(),
     "documents":[{"kind":d.kind,"status":d.status,"reason":d.reason} for d in Document.query.filter_by(application_id=a.id)],
     "payments":[{"ref":p.reference,"amount":p.amount,"status":p.status,"mode":p.mode,"date":p.created.isoformat()} for p in Payment.query.filter_by(application_id=a.id)],
     "history":[{"status":h.status,"note":h.note,"at":h.at.isoformat()} for h in StatusHistory.query.filter_by(application_id=a.id)],
     "rank":a.rank if a.published else None,"merit_score":a.merit_score if a.published else None}
@bp.get("/application")
@roles("student")
def get_app(): return ok(ser(myapp()))
@bp.get("/courses")
@roles("student")
def courses(): return ok([{"id":c.id,"name":c.name,"dept":c.department and c.department.name,"intake":c.intake,"years":c.duration_years,"min_percentage":c.min_percentage,"fee":c.fee} for c in Course.query.filter_by(active=True)])
@bp.put("/application")
@roles("student")
def save():
    a=myapp()
    if a.status not in ("Draft","Documents Pending"): return err("Application locked after submission",409)
    j=request.json or {}
    if "details" in j:
        try: a.details=j["details"]; a.percentage=calc_pct(a.details)
        except (KeyError,ValueError,TypeError): return err("Invalid marks")
    if j.get("course_id"):
        if not Course.query.filter_by(id=j["course_id"],active=True).first(): return err("Invalid course")
        a.course_id=j["course_id"]
    db.session.commit(); return ok(ser(a))
@bp.post("/documents")
@roles("student")
def upload():
    a=myapp(); f=request.files.get("file"); kind=request.form.get("kind")
    if kind not in DOCS or not f: return err("kind and file required")
    ext=f.filename.rsplit(".",1)[-1].lower()
    if ext not in ("pdf","jpg","jpeg","png"): return err("Only pdf/jpg/png allowed")
    head=f.stream.read(4); f.stream.seek(0)
    if not (head.startswith(b"%PDF") or head.startswith(b"\xff\xd8") or head.startswith(b"\x89PNG")): return err("File content does not match type")
    os.makedirs(current_app.config["UPLOAD_DIR"],exist_ok=True)
    name=uuid.uuid4().hex+"."+ext; f.save(os.path.join(current_app.config["UPLOAD_DIR"],name))
    d=Document.query.filter_by(application_id=a.id,kind=kind).first() or Document(application_id=a.id,kind=kind)
    d.path=name; d.status="Pending"; d.reason=None; db.session.add(d); db.session.commit(); return ok(ser(a),201)
@bp.post("/payment")
@roles("student")
def pay():
    a=myapp()
    if not a.course_id: return err("Select a course first")
    if Payment.query.filter_by(application_id=a.id,status="Paid").first(): return err("Already paid",409)
    p=Payment(application_id=a.id,amount=a.course.fee,reference="SIM"+uuid.uuid4().hex[:10].upper(),status="Paid",mode="SIMULATED")
    db.session.add(p); notify(a.applicant_id,"Simulated payment recorded (not a real transaction)"); db.session.commit(); return ok(ser(a))
@bp.post("/submit")
@roles("student")
def submit():
    a=myapp()
    if a.status not in ("Draft","Documents Pending"): return err("Already submitted",409)
    miss=[]
    if a.percentage is None: miss.append("academic details")
    if not a.course_id: miss.append("course")
    have={d.kind for d in Document.query.filter_by(application_id=a.id)}
    miss+=[k for k in DOCS if k not in have]
    if not Payment.query.filter_by(application_id=a.id,status="Paid").first(): miss.append("fee payment")
    if miss: return err("Incomplete: "+", ".join(miss),422)
    a.submitted_at=datetime.utcnow(); set_status(a,"Submitted","Application submitted")
    notify(a.applicant_id,f"Application {a.app_no} submitted"); db.session.commit(); return ok(ser(a))
@bp.get("/notifications")
@roles("student")
def notes(): return ok([{"m":n.message,"at":n.at.isoformat()} for n in Notification.query.filter_by(user_id=cur().id).order_by(Notification.id.desc())])
@bp.get("/allocation")
@roles("student")
def alloc():
    a=myapp(); x=Allocation.query.filter_by(application_id=a.id).first()
    return ok(x and {"course":db.session.get(Course,x.course_id).name,"status":x.status,"register_no":x.register_no})
@bp.post("/allocation/<act>")
@roles("student")
def respond(act):
    a=myapp(); x=Allocation.query.filter_by(application_id=a.id).first()
    if not x or x.status!="Offered" or act not in("accept","decline"): return err("No pending offer",409)
    x.status="Accepted" if act=="accept" else "Declined"
    if act=="decline": set_status(a,"Rejected","Offer declined")
    db.session.commit(); return ok({"status":x.status})
@bp.get("/documents/<kind>")
@roles("student")
def doc_file(kind):
    d=Document.query.filter_by(application_id=myapp().id,kind=kind).first_or_404()
    return send_file(os.path.join(current_app.config["UPLOAD_DIR"],d.path))

# ============================================================
# COMPLETE STUDENT PORTAL APIs
# Add this section below the existing student routes.
# ============================================================

from datetime import date
import uuid


def student_course():
    """Return the student's confirmed admission allocation."""
    a = myapp()
    if not a:
        return None, None

    allocation = Allocation.query.filter_by(
        application_id=a.id,
        status="Confirmed"
    ).first()

    if not allocation:
        return a, None

    return a, db.session.get(Course, allocation.course_id)


def student_subjects():
    """Get subjects belonging to the student's confirmed course."""
    a, course = student_course()

    if not course:
        return []

    q = Subject.query.filter_by(active=True)

    q = q.filter(
        db.or_(
            Subject.course_id == course.id,
            db.and_(
                Subject.course_id.is_(None),
                Subject.department == course.department.name
            )
        )
    )

    return q.order_by(Subject.semester_id, Subject.name).all()


def student_subject_ids():
    return [s.id for s in student_subjects()]


# ---------------- DASHBOARD & PROFILE ----------------

@bp.get("/dashboard")
@roles("student")
def student_dashboard():
    a, course = student_course()
    subjects = student_subjects()

    attendance_rows = Attendance.query.filter_by(
        student_id=cur().id
    ).all()

    total = len(attendance_rows)
    attended = sum(
        1 for x in attendance_rows
        if x.status in ("Present", "OD")
    )

    pending_fees = StudentFee.query.filter_by(
        student_id=cur().id,
        status="Pending"
    ).count()

    return ok({
        "name": cur().name,
        "register_no": course and Allocation.query.filter_by(
            application_id=a.id
        ).first().register_no,
        "department": cur().department,
        "course": course and course.name,
        "attendance_percentage": round(attended * 100 / total, 2) if total else None,
        "pending_fees": pending_fees,
        "subject_count": len(subjects),
        "admission_status": a.status if a else None
    })


@bp.get("/profile")
@roles("student")
def student_profile():
    u = cur()
    a, course = student_course()

    return ok({
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "mobile": u.mobile,
        "dob": u.dob,
        "gender": u.gender,
        "department": u.department,
        "register_no": (
            Allocation.query.filter_by(application_id=a.id).first().register_no
            if a and course else None
        ),
        "course": course.name if course else None,
        "student_code": u.code
    })


# ---------------- ATTENDANCE ----------------

@bp.get("/attendance")
@roles("student")
def student_attendance():
    ids = student_subject_ids()

    subject_id = request.args.get("subject_id", type=int)

    q = Attendance.query.filter(
        Attendance.student_id == cur().id,
        Attendance.subject_id.in_(ids)
    )

    if subject_id:
        if subject_id not in ids:
            return err("Subject not available to this student", 403)
        q = q.filter_by(subject_id=subject_id)

    records = q.order_by(
        Attendance.attendance_date.desc()
    ).all()

    output = []

    for s in student_subjects():
        if subject_id and s.id != subject_id:
            continue

        rows = [r for r in records if r.subject_id == s.id]
        total = len(rows)
        present = sum(
            1 for r in rows if r.status in ("Present", "OD")
        )

        output.append({
            "subject_id": s.id,
            "subject": s.name,
            "subject_code": s.code,
            "total_classes": total,
            "attended": present,
            "absent": sum(1 for r in rows if r.status == "Absent"),
            "percentage": round(present * 100 / total, 2) if total else None
        })

    return ok({
        "summary": output,
        "records": [{
            "subject": r.subject.name,
            "date": r.attendance_date.isoformat(),
            "period": r.period_number,
            "status": r.status,
            "remarks": r.remarks
        } for r in records]
    })


# ---------------- INTERNAL MARKS ----------------

@bp.get("/internal-marks")
@roles("student")
def student_internal_marks():
    ids = student_subject_ids()

    rows = InternalMark.query.filter(
        InternalMark.student_id == cur().id,
        InternalMark.subject_id.in_(ids)
    ).order_by(InternalMark.subject_id).all()

    return ok([{
        "subject": r.subject.name,
        "subject_code": r.subject.code,
        "assessment": r.assessment_type,
        "marks": r.marks_obtained,
        "maximum": r.maximum_marks,
        "remarks": r.remarks
    } for r in rows])


# ---------------- SEMESTER RESULTS & CGPA ----------------

@bp.get("/results")
@roles("student")
def student_results():
    ids = student_subject_ids()

    rows = SemesterResult.query.filter(
        SemesterResult.student_id == cur().id,
        SemesterResult.subject_id.in_(ids),
        SemesterResult.published.is_(True)
    ).all()

    total_credits = sum(r.credits for r in rows)
    weighted_points = sum(
        r.grade_points * r.credits for r in rows
    )

    return ok({
        "cgpa": round(weighted_points / total_credits, 2)
        if total_credits else None,
        "results": [{
            "semester": r.semester.name,
            "subject": r.subject.name,
            "internal": r.internal_marks,
            "external": r.external_marks,
            "total": r.total_marks,
            "grade": r.grade,
            "grade_points": r.grade_points,
            "credits": r.credits
        } for r in rows]
    })


# ---------------- EXAM TIMETABLE ----------------

@bp.get("/exam-timetable")
@roles("student")
def student_exam_timetable():
    ids = student_subject_ids()

    rows = ExamSchedule.query.filter(
        ExamSchedule.subject_id.in_(ids),
        ExamSchedule.published.is_(True)
    ).order_by(ExamSchedule.exam_date, ExamSchedule.start_time).all()

    return ok([{
        "subject": r.subject.name,
        "subject_code": r.subject.code,
        "exam_type": r.exam_type,
        "date": r.exam_date.isoformat(),
        "start_time": r.start_time.strftime("%H:%M"),
        "end_time": r.end_time.strftime("%H:%M"),
        "room": r.room,
        "instructions": r.instructions
    } for r in rows])


# ---------------- HALL TICKET ----------------

@bp.get("/hall-tickets")
@roles("student")
def student_hall_tickets():
    rows = HallTicket.query.filter_by(
        student_id=cur().id,
        issued=True
    ).all()

    return ok([{
        "number": r.hall_ticket_number,
        "semester": r.semester.name,
        "exam_type": r.exam_type,
        "eligible": r.eligible,
        "issued_at": r.issued_at.isoformat() if r.issued_at else None
    } for r in rows])


# ---------------- FEES & DEMO PAYMENT ----------------

@bp.get("/fees")
@roles("student")
def student_fees():
    rows = StudentFee.query.filter_by(
        student_id=cur().id
    ).order_by(StudentFee.created_at.desc()).all()

    return ok([{
        "id": r.id,
        "type": r.fee_type,
        "amount": r.amount,
        "due_date": r.due_date.isoformat() if r.due_date else None,
        "status": r.status,
        "reference": r.payment_reference,
        "mode": r.payment_mode,
        "paid_at": r.paid_at.isoformat() if r.paid_at else None
    } for r in rows])


@bp.post("/fees/<int:fee_id>/pay")
@roles("student")
def pay_student_fee(fee_id):
    fee = StudentFee.query.filter_by(
        id=fee_id,
        student_id=cur().id
    ).first()

    if not fee:
        return err("Fee record not found", 404)

    if fee.status == "Paid":
        return err("Fee already paid", 409)

    fee.status = "Paid"
    fee.payment_mode = "DEMO"
    fee.payment_reference = "DEMO" + uuid.uuid4().hex[:12].upper()
    fee.paid_at = datetime.utcnow()

    notify(cur().id, f"Demo payment recorded for {fee.fee_type}")
    audit(f"Demo fee payment: {fee.id}")
    db.session.commit()

    return ok({
        "message": "Demo payment recorded. No real money was charged.",
        "reference": fee.payment_reference
    })


# ---------------- LEAVE APPLICATION ----------------

@bp.get("/leaves")
@roles("student")
def student_leaves():
    rows = LeaveApplication.query.filter_by(
        student_id=cur().id
    ).order_by(LeaveApplication.created_at.desc()).all()

    return ok([{
        "id": r.id,
        "from_date": r.from_date.isoformat(),
        "to_date": r.to_date.isoformat(),
        "reason": r.reason,
        "status": r.status,
        "reviewer_note": r.reviewer_note
    } for r in rows])


@bp.post("/leaves")
@roles("student")
def apply_leave():
    j = request.json or {}

    try:
        start = date.fromisoformat(j.get("from_date", ""))
        end = date.fromisoformat(j.get("to_date", ""))
    except (ValueError, TypeError):
        return err("Invalid leave dates")

    reason = (j.get("reason") or "").strip()

    if end < start:
        return err("End date cannot be before start date")

    if not reason or len(reason) > 2000:
        return err("Enter a valid leave reason")

    leave = LeaveApplication(
        student_id=cur().id,
        from_date=start,
        to_date=end,
        reason=reason
    )

    db.session.add(leave)
    notify(cur().id, "Your leave application has been submitted")
    db.session.commit()

    return ok({"message": "Leave application submitted"}, 201)


# ---------------- SCHOLARSHIPS ----------------

@bp.get("/scholarships")
@roles("student")
def student_scholarships():
    rows = Scholarship.query.filter_by(active=True).all()

    applications = {
        x.scholarship_id: x.status
        for x in ScholarshipApplication.query.filter_by(
            student_id=cur().id
        ).all()
    }

    return ok([{
        "id": s.id,
        "title": s.title,
        "description": s.description,
        "eligibility": s.eligibility,
        "amount": s.amount,
        "application_status": applications.get(s.id)
    } for s in rows])


@bp.post("/scholarships/<int:scholarship_id>/apply")
@roles("student")
def apply_scholarship(scholarship_id):
    scholarship = Scholarship.query.filter_by(
        id=scholarship_id,
        active=True
    ).first()

    if not scholarship:
        return err("Scholarship not found", 404)

    j = request.json or {}
    reason = (j.get("reason") or "").strip()

    if not reason:
        return err("Application reason is required")

    existing = ScholarshipApplication.query.filter_by(
        student_id=cur().id,
        scholarship_id=scholarship_id
    ).first()

    if existing:
        return err("Already applied", 409)

    db.session.add(ScholarshipApplication(
        student_id=cur().id,
        scholarship_id=scholarship_id,
        reason=reason
    ))

    db.session.commit()
    return ok({"message": "Scholarship application submitted"}, 201)


# ---------------- CERTIFICATE REQUESTS ----------------

@bp.get("/certificates")
@roles("student")
def student_certificates():
    rows = CertificateRequest.query.filter_by(
        student_id=cur().id
    ).order_by(CertificateRequest.created_at.desc()).all()

    return ok([{
        "id": r.id,
        "type": r.certificate_type,
        "purpose": r.purpose,
        "status": r.status,
        "admin_note": r.admin_note
    } for r in rows])


@bp.post("/certificates")
@roles("student")
def request_certificate():
    j = request.json or {}
    kind = (j.get("certificate_type") or "").strip()
    purpose = (j.get("purpose") or "").strip()

    allowed = {
        "Bonafide Certificate",
        "Transfer Certificate",
        "Course Completion Certificate",
        "Character Certificate",
        "Fee Certificate"
    }

    if kind not in allowed or not purpose:
        return err("Select a valid certificate type and enter its purpose")

    db.session.add(CertificateRequest(
        student_id=cur().id,
        certificate_type=kind,
        purpose=purpose
    ))

    db.session.commit()
    return ok({"message": "Certificate request submitted"}, 201)


# ---------------- GRIEVANCES ----------------

@bp.get("/grievances")
@roles("student")
def student_grievances():
    rows = Grievance.query.filter_by(
        student_id=cur().id
    ).order_by(Grievance.created_at.desc()).all()

    return ok([{
        "id": r.id,
        "category": r.category,
        "subject": r.subject,
        "description": r.description,
        "status": r.status,
        "response": r.response,
        "created_at": r.created_at.isoformat()
    } for r in rows])


@bp.post("/grievances")
@roles("student")
def submit_grievance():
    j = request.json or {}

    category = (j.get("category") or "").strip()
    subject = (j.get("subject") or "").strip()
    description = (j.get("description") or "").strip()

    allowed = {
        "Academic",
        "Examination",
        "Fees",
        "Faculty",
        "Infrastructure",
        "Other"
    }

    if category not in allowed or not subject or not description:
        return err("Enter a valid grievance category, subject and description")

    if len(description) > 5000:
        return err("Description is too long")

    db.session.add(Grievance(
        student_id=cur().id,
        category=category,
        subject=subject,
        description=description
    ))

    db.session.commit()
    return ok({"message": "Grievance submitted successfully"}, 201)


# ---------------- LIBRARY ----------------

@bp.get("/library/books")
@roles("student")
def student_library_books():
    rows = LibraryBook.query.filter_by(active=True).order_by(
        LibraryBook.title
    ).all()

    return ok([{
        "id": b.id,
        "accession_number": b.accession_number,
        "title": b.title,
        "author": b.author,
        "category": b.category,
        "available_copies": b.available_copies
    } for b in rows])


@bp.get("/library/loans")
@roles("student")
def student_library_loans():
    rows = LibraryLoan.query.filter_by(
        student_id=cur().id
    ).order_by(LibraryLoan.issue_date.desc()).all()

    return ok([{
        "book": r.book.title,
        "issue_date": r.issue_date.isoformat(),
        "due_date": r.due_date.isoformat(),
        "return_date": r.return_date.isoformat() if r.return_date else None,
        "status": r.status
    } for r in rows])

