import os
from flask import Flask,send_from_directory
from .config import Config
from .extensions import db
def create_app(cfg=None):
    app=Flask(__name__); app.config.from_object(Config); app.config.update(cfg or {})
    db.init_app(app)
    from .routes import auth,student,faculty,admin
    for m in (auth,student,faculty,admin): app.register_blueprint(m.bp)
    with app.app_context(): db.create_all()
    fe=os.path.abspath(os.path.join(os.path.dirname(__file__),"..","..","frontend"))
    @app.get("/")
    def index(): return send_from_directory(fe,"index.html")
    @app.get("/js/<path:p>")
    def st(p): return send_from_directory(os.path.join(fe,"js"),p)
    @app.errorhandler(413)
    def big(e): return {"success":False,"error":"File too large (2MB max)"},413
    return app
