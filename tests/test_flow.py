import sys,os,io
sys.path.insert(0,os.path.join(os.path.dirname(__file__),"..","backend"))
import pytest
from app import create_app
from app.extensions import db
from app.models import User
from werkzeug.security import generate_password_hash as gh
@pytest.fixture
def c(tmp_path):
    app=create_app({"SQLALCHEMY_DATABASE_URI":"sqlite:///"+str(tmp_path/"t.db"),"UPLOAD_DIR":str(tmp_path),"TESTING":True})
    with app.app_context(): db.session.add(User(email="a@x.com",name="Admin",role="admin",password_hash=gh("adminpass1"))); db.session.commit()
    return app.test_client()
def login(c,role,e,p):
    r=c.post(f"/api/auth/login/{role}",json={"email":e,"password":p}); return r,{"X-CSRF-Token":(r.json["data"]["csrf"] if r.status_code==200 else "")}
def test_full_flow(c):
    reg={"name":"Stu","email":"s@x.com","mobile":"9876543210","password":"password1","confirm":"password1"}
    assert c.post("/api/auth/register",json=reg).status_code==201
    assert c.post("/api/auth/register",json=reg).status_code==409
    assert c.post("/api/auth/login/student",json={"email":"s@x.com","password":"bad"}).status_code==401
    assert c.get("/api/admin/stats").status_code==403
    c.post("/api/auth/register",json={"name":"Fac","email":"f@college.edu","password":"password1","confirm":"password1","role":"faculty","department":"CS"})
    assert login(c,"faculty","f@college.edu","password1")[0].status_code==403
    r,h=login(c,"admin","a@x.com","adminpass1")
    assert c.post("/api/admin/courses",json={"name":"BE CSE","department":"CS","intake":1,"min_percentage":60},headers=h).status_code==201
    c.post("/api/admin/faculty/3/approve",headers=h); c.post("/api/auth/logout")
    r,h=login(c,"student","s@x.com","password1")
    assert c.get("/api/admin/stats").status_code==403
    sub={"subjects":[{"marks":80,"max":100},{"marks":70,"max":100}]}
    c.put("/api/student/application",json={"course_id":1,"details":{"tenth":sub,"twelfth":sub}},headers=h)
    assert c.post("/api/student/submit",headers=h).status_code==422
    bad=c.post("/api/student/documents",data={"kind":"10th Marksheet","file":(io.BytesIO(b"MZ exe"),"a.pdf")},headers=h)
    assert bad.status_code==400
    for k in ["10th Marksheet","12th Marksheet","Transfer Certificate","Community Certificate","Photograph","Government ID"]:
        assert c.post("/api/student/documents",data={"kind":k,"file":(io.BytesIO(b"%PDF-1.4"),"a.pdf")},headers=h).status_code==201
    c.post("/api/student/payment",headers=h)
    assert c.post("/api/student/submit",headers=h).status_code==200
    c.post("/api/auth/logout"); r,h=login(c,"admin","a@x.com","adminpass1")
    assert c.post("/api/admin/applications/1/assign",json={"faculty_id":3},headers=h).status_code==200
    c.post("/api/auth/logout"); r,h=login(c,"faculty","f@college.edu","password1")
    rv=c.post("/api/faculty/applications/1/review",json={"recommendation":"approve","remarks":"ok"},headers=h); print(rv.json); assert rv.json["data"]["eligible"]
    c.post("/api/auth/logout"); r,h=login(c,"admin","a@x.com","adminpass1")
    c.post("/api/admin/merit/calculate",headers=h); c.post("/api/admin/merit/publish",headers=h)
    assert c.post("/api/admin/allocate",headers=h).json["data"]["allocated"]==1
    assert c.post("/api/admin/applications/1/confirm",headers=h).status_code==409
    c.post("/api/auth/logout"); r,h=login(c,"student","s@x.com","password1")
    c.post("/api/student/allocation/accept",headers=h); c.post("/api/auth/logout")
    r,h=login(c,"admin","a@x.com","adminpass1")
    assert c.post("/api/admin/applications/1/confirm",headers=h).json["data"]["register_no"].startswith("REG")
