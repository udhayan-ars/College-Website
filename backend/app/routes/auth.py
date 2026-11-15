import re
from flask import Blueprint,request,session,current_app
from werkzeug.security import generate_password_hash as gh,check_password_hash as ch
from ..utils import *
bp=Blueprint("auth",__name__,url_prefix="/api/auth")
def me(u): return {"id":u.id,"name":u.name,"email":u.email,"role":u.role,"code":u.code,"department":u.department,"designation":u.designation,"csrf":session.get("csrf")}
@bp.post("/register")
def register():
    j=request.json or {}; role=j.get("role","student")
    em=(j.get("email") or "").lower().strip()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$",em): return err("Invalid email")
    if len(j.get("password",""))<8 or j.get("password")!=j.get("confirm"): return err("Passwords must match and be 8+ characters")
    if not j.get("name"): return err("Name required")
    if User.query.filter_by(email=em).first(): return err("Account exists",409)
    if role=="student":
        if not re.match(r"^[6-9]\d{9}$",j.get("mobile","")): return err("Invalid mobile")
        if User.query.filter_by(mobile=j["mobile"]).first(): return err("Mobile exists",409)
        u=User(email=em,mobile=j["mobile"],name=j["name"],dob=j.get("dob"),gender=j.get("gender"),role="student",password_hash=gh(j["password"]))
        db.session.add(u); db.session.flush()
        a=Application(applicant_id=u.id,app_no=f"APP2026{u.id:05d}",details={}); db.session.add(a); db.session.flush()
        set_status(a,"Draft","Account created"); db.session.commit()
        return ok({"application_number":a.app_no,"email_verification":"not configured - email NOT verified"},201)
    if role=="faculty":
        if not em.endswith("@"+current_app.config["FACULTY_EMAIL_DOMAIN"]): return err("Use college email")
        u=User(email=em,name=j["name"],role="faculty",code=j.get("faculty_id"),department=j.get("department"),designation=j.get("designation"),password_hash=gh(j["password"]),approved=False)
        db.session.add(u); db.session.commit(); return ok({"message":"Awaiting admin approval"},201)
    return err("Invalid role")
@bp.post("/login/<role>")
def login(role):
    j=request.json or {}
    if rate_limited(request.remote_addr): return err("Too many attempts",429)
    u=User.query.filter_by(email=(j.get("email") or "").lower(),role=role).first()
    if not u or not ch(u.password_hash,j.get("password","")):
        record_failure(request.remote_addr); return err("Invalid credentials",401)
    if not u.active or not u.approved: return err("Account inactive or not approved",403)
    session.clear(); session["uid"]=u.id; session["csrf"]=secrets.token_hex(16)
    return ok(me(u))
@bp.post("/logout")
def logout(): session.clear(); return ok()
@bp.get("/me")
def profile():
    u=cur(); return ok(me(u)) if u else err("Not logged in",401)
@bp.post("/forgot-password")
def forgot():
    if not current_app.config["SMTP_HOST"]: return err("Email service not configured; contact admin",503)
    return ok({"message":"If the account exists, a reset mail was sent"})
