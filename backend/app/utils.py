import functools,secrets,time,collections
from flask import session,jsonify,request
from .extensions import db
from .models import *
def ok(d=None,c=200): return jsonify({"success":True,"data":d}),c
def err(m,c=400): return jsonify({"success":False,"error":m}),c
def cur(): return db.session.get(User,session["uid"]) if "uid" in session else None
def audit(a): db.session.add(AuditLog(user_id=session.get("uid"),action=a))
def notify(uid,m): db.session.add(Notification(user_id=uid,message=m))
def set_status(app,s,note=""):
    app.status=s; db.session.add(StatusHistory(application_id=app.id,status=s,note=note))
def roles(*r):
    def d(f):
        @functools.wraps(f)
        def w(*a,**k):
            u=cur()
            if not u or not u.active or u.role not in r: return err("Forbidden",403)
            if request.method!="GET" and request.headers.get("X-CSRF-Token")!=session.get("csrf"): return err("CSRF check failed",403)
            return f(*a,**k)
        return w
    return d
_hits=collections.defaultdict(list)
def rate_limited(key,n=8,win=60):
    t=time.time(); _hits[key]=[x for x in _hits[key] if t-x<win]
    return len(_hits[key])>=n
def record_failure(key): _hits[key].append(time.time())
def calc_pct(d):
    tot=got=0
    for lvl in ("tenth","twelfth"):
        for s in (d.get(lvl,{}).get("subjects") or []):
            got+=float(s["marks"]); tot+=float(s["max"])
    return round(got*100/tot,2) if tot else None
