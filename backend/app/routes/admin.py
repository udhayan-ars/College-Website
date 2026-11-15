from datetime import datetime
from flask import Blueprint,request
from sqlalchemy import func
from ..utils import *
bp=Blueprint("admin",__name__,url_prefix="/api/admin")
@bp.get("/stats")
@roles("admin")
def stats():
    c=lambda **k: Application.query.filter_by(**k).count()
    return ok({"applicants":User.query.filter_by(role="student").count(),"submitted":Application.query.filter(Application.submitted_at.isnot(None)).count(),
      "approved":c(status="Approved"),"rejected":c(status="Rejected"),"seat_allocated":Allocation.query.count(),
      "confirmed":Allocation.query.filter_by(status="Confirmed").count(),"paid":Payment.query.filter_by(status="Paid").count(),
      "by_course":[{"course":n,"count":k} for n,k in db.session.query(Course.name,func.count(Application.id)).outerjoin(Application,Application.course_id==Course.id).group_by(Course.id)]})
@bp.post("/courses")
@roles("admin")
def add_course():
    j=request.json or {}
    try:
        if not j.get("name") or int(j.get("intake",0))<1: return err("name and intake>0 required")
        dn=j.get("department") or "General"
        d=Department.query.filter_by(name=dn).first() or Department(name=dn)
        db.session.add(d); db.session.flush()
        db.session.add(Course(name=j["name"],department_id=d.id,intake=int(j["intake"]),min_percentage=float(j.get("min_percentage") or 50),fee=float(j.get("fee") or 500),duration_years=int(j.get("years",4))))
        audit("course add"); db.session.commit()
    except ValueError: db.session.rollback(); return err("Bad number")
    except Exception: db.session.rollback(); return err("Course exists",409)
    return ok(None,201)
@bp.get("/applications")
@roles("admin")
def apps():
    return ok([{"id":a.id,"app_no":a.app_no,"name":a.applicant.name,"status":a.status,"course":a.course and a.course.name,"faculty_id":a.faculty_id,"recommendation":a.recommendation,"rank":a.rank,"score":a.merit_score} for a in Application.query.filter(Application.submitted_at.isnot(None))])
@bp.get("/faculty")
@roles("admin")
def fac(): return ok([{"id":u.id,"name":u.name,"dept":u.department,"approved":u.approved} for u in User.query.filter_by(role="faculty")])
@bp.post("/faculty/<int:i>/approve")
@roles("admin")
def approve_fac(i):
    u=User.query.filter_by(id=i,role="faculty").first_or_404(); u.approved=True; audit(f"faculty {i} approved"); db.session.commit(); return ok()
@bp.post("/applications/<int:i>/assign")
@roles("admin")
def assign(i):
    a=db.get_or_404(Application,i); f=User.query.filter_by(id=(request.json or {}).get("faculty_id"),role="faculty",approved=True).first()
    if not f or not a.submitted_at: return err("Invalid faculty or unsubmitted application")
    a.faculty_id=f.id; set_status(a,"Under Review",f"Assigned to {f.name}"); notify(f.id,f"Application {a.app_no} assigned"); audit(f"assign {i}"); db.session.commit(); return ok()
@bp.post("/merit/calculate")
@roles("admin")
def merit():
    # Transparent rule: merit score = combined 10th+12th percentage; ties broken by earlier submission
    for c in Course.query.all():
        rows=Application.query.filter_by(course_id=c.id,eligible=True).order_by(Application.percentage.desc(),Application.submitted_at).all()
        for n,a in enumerate(rows,1): a.merit_score=a.percentage; a.rank=n
    audit("merit calc"); db.session.commit(); return ok()
@bp.post("/merit/publish")
@roles("admin")
def publish():
    for a in Application.query.filter(Application.rank.isnot(None)):
        a.published=True; set_status(a,"Selected" if a.rank<=a.course.intake else "Waitlisted","Merit list published"); notify(a.applicant_id,f"Merit list published. Rank {a.rank}")
    audit("merit publish"); db.session.commit(); return ok()
@bp.post("/allocate")
@roles("admin")
def allocate():
    n=0
    for c in Course.query.all():
        used=Allocation.query.filter(Allocation.course_id==c.id,Allocation.status!="Declined").count()
        for a in Application.query.filter_by(course_id=c.id,published=True).order_by(Application.rank):
            if used>=c.intake: break
            if a.recommendation!="approve" or Allocation.query.filter_by(application_id=a.id).first(): continue
            db.session.add(Allocation(application_id=a.id,course_id=c.id)); set_status(a,"Seat Allocated","Offer issued"); notify(a.applicant_id,f"Seat offered in {c.name}"); used+=1; n+=1
    audit("allocate"); db.session.commit(); return ok({"allocated":n})
@bp.post("/applications/<int:i>/confirm")
@roles("admin")
def confirm(i):
    x=Allocation.query.filter_by(application_id=i).first_or_404()
    if x.status!="Accepted": return err("Applicant has not accepted the offer",409)
    x.status="Confirmed"; x.register_no=f"REG{datetime.utcnow().year}{x.id:05d}"
    a=db.session.get(Application,i); set_status(a,"Admission Confirmed",x.register_no); notify(a.applicant_id,f"Admission confirmed. Register no {x.register_no}"); audit(f"confirm {i}"); db.session.commit(); return ok({"register_no":x.register_no})
@bp.post("/notify")
@roles("admin")
def announce():
    m=(request.json or {}).get("message")
    if not m: return err("message required")
    for u in User.query.filter_by(role="student"): notify(u.id,m)
    db.session.commit(); return ok()
