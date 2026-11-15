from datetime import datetime
from ..extensions import db
now=datetime.utcnow
class User(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    email=db.Column(db.String(120),unique=True,nullable=False,index=True)
    mobile=db.Column(db.String(15),unique=True)
    password_hash=db.Column(db.String(255),nullable=False)
    role=db.Column(db.String(10),nullable=False,index=True)
    name=db.Column(db.String(100),nullable=False)
    dob=db.Column(db.String(10)); gender=db.Column(db.String(10))
    code=db.Column(db.String(30))
    department=db.Column(db.String(80)); designation=db.Column(db.String(80))
    active=db.Column(db.Boolean,default=True); approved=db.Column(db.Boolean,default=True)
    created=db.Column(db.DateTime,default=now)
class Department(db.Model):
    id=db.Column(db.Integer,primary_key=True); name=db.Column(db.String(80),unique=True,nullable=False)
class Course(db.Model):
    id=db.Column(db.Integer,primary_key=True); name=db.Column(db.String(100),unique=True,nullable=False)
    department_id=db.Column(db.Integer,db.ForeignKey("department.id"))
    duration_years=db.Column(db.Integer,default=4); intake=db.Column(db.Integer,nullable=False,default=60)
    min_percentage=db.Column(db.Float,default=50); fee=db.Column(db.Float,default=500)
    active=db.Column(db.Boolean,default=True)
    department=db.relationship("Department")
class Application(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    applicant_id=db.Column(db.Integer,db.ForeignKey("user.id"),unique=True,nullable=False)
    app_no=db.Column(db.String(20),unique=True,index=True)
    status=db.Column(db.String(30),default="Draft",index=True)
    course_id=db.Column(db.Integer,db.ForeignKey("course.id"))
    details=db.Column(db.JSON,default=dict)
    percentage=db.Column(db.Float)
    faculty_id=db.Column(db.Integer,db.ForeignKey("user.id"))
    recommendation=db.Column(db.String(20)); remarks=db.Column(db.Text)
    eligible=db.Column(db.Boolean)
    merit_score=db.Column(db.Float); rank=db.Column(db.Integer); published=db.Column(db.Boolean,default=False)
    submitted_at=db.Column(db.DateTime)
    applicant=db.relationship("User",foreign_keys=[applicant_id]); course=db.relationship("Course")
class Document(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    application_id=db.Column(db.Integer,db.ForeignKey("application.id"),index=True)
    kind=db.Column(db.String(40)); path=db.Column(db.String(255))
    status=db.Column(db.String(15),default="Pending"); reason=db.Column(db.String(255))
    __table_args__=(db.UniqueConstraint("application_id","kind"),)
class Payment(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    application_id=db.Column(db.Integer,db.ForeignKey("application.id"),index=True)
    amount=db.Column(db.Float); reference=db.Column(db.String(40),unique=True)
    mode=db.Column(db.String(20),default="SIMULATED"); status=db.Column(db.String(15),default="Pending")
    created=db.Column(db.DateTime,default=now)
class Allocation(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    application_id=db.Column(db.Integer,db.ForeignKey("application.id"),unique=True)
    course_id=db.Column(db.Integer,db.ForeignKey("course.id"),index=True)
    status=db.Column(db.String(15),default="Offered")
    register_no=db.Column(db.String(30),unique=True); created=db.Column(db.DateTime,default=now)
class StatusHistory(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    application_id=db.Column(db.Integer,db.ForeignKey("application.id"),index=True)
    status=db.Column(db.String(30)); note=db.Column(db.String(255)); at=db.Column(db.DateTime,default=now)
class Notification(db.Model):
    id=db.Column(db.Integer,primary_key=True); user_id=db.Column(db.Integer,db.ForeignKey("user.id"),index=True)
    message=db.Column(db.String(255)); at=db.Column(db.DateTime,default=now)
class AuditLog(db.Model):
    id=db.Column(db.Integer,primary_key=True); user_id=db.Column(db.Integer); action=db.Column(db.String(120))
    at=db.Column(db.DateTime,default=now)
from .erp import *
