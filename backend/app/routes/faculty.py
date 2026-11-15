import os
from flask import Blueprint,request,current_app,send_file
from ..utils import *
bp=Blueprint("faculty",__name__,url_prefix="/api/faculty")
def mine(i): return Application.query.filter_by(id=i,faculty_id=cur().id).first()
@bp.get("/applications")
@roles("faculty")
def lst():
    q=Application.query.filter_by(faculty_id=cur().id)
    if request.args.get("status"): q=q.filter_by(status=request.args["status"])
    s=request.args.get("q")
    return ok([{"id":a.id,"app_no":a.app_no,"name":a.applicant.name,"course":a.course and a.course.name,"status":a.status,"percentage":a.percentage} for a in q if not s or s.lower() in (a.app_no+a.applicant.name).lower()])
@bp.get("/applications/<int:i>")
@roles("faculty")
def detail(i):
    a=mine(i)
    if not a: return err("Not found",404)
    return ok({"id":a.id,"app_no":a.app_no,"name":a.applicant.name,"details":a.details,"percentage":a.percentage,"course":a.course and {"name":a.course.name,"min_percentage":a.course.min_percentage},
      "documents":[{"id":d.id,"kind":d.kind,"status":d.status,"reason":d.reason} for d in Document.query.filter_by(application_id=a.id)]})
@bp.get("/documents/<int:i>/file")
@roles("faculty")
def file(i):
    d=db.get_or_404(Document,i)
    if not mine(d.application_id): return err("Forbidden",403)
    return send_file(os.path.join(current_app.config["UPLOAD_DIR"],d.path))
@bp.post("/documents/<int:i>/verify")
@roles("faculty")
def verify(i):
    d=db.get_or_404(Document,i); a=mine(d.application_id); j=request.json or {}
    if not a: return err("Forbidden",403)
    if j.get("status") not in("Approved","Rejected"): return err("Invalid status")
    if j["status"]=="Rejected" and not j.get("reason"): return err("Rejection reason required")
    d.status=j["status"]; d.reason=j.get("reason")
    if d.status=="Rejected":
        set_status(a,"Documents Pending",f"{d.kind} rejected"); notify(a.applicant_id,f"{d.kind} rejected: {d.reason}")
    audit(f"doc {i} {d.status}"); db.session.commit(); return ok()
@bp.post("/applications/<int:i>/review")
@roles("faculty")
def review(i):
    a=mine(i); j=request.json or {}
    if not a: return err("Not found",404)
    if j.get("recommendation") not in("approve","reject"): return err("recommendation must be approve/reject")
    a.eligible=bool(a.percentage is not None and a.course and a.percentage>=a.course.min_percentage)
    if j["recommendation"]=="approve" and not a.eligible: return err("Cannot recommend approval: applicant is ineligible",422)
    a.recommendation=j["recommendation"]; a.remarks=j.get("remarks")
    set_status(a,"Eligible" if a.eligible else "Ineligible",j.get("remarks","")); audit(f"review app {i}"); db.session.commit()
    return ok({"eligible":a.eligible})
