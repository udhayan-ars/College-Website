import os
class Config:
    SECRET_KEY=os.environ.get("SECRET_KEY","dev-change-me")
    SQLALCHEMY_DATABASE_URI=os.environ.get("DATABASE_URL","sqlite:///admission.db")
    UPLOAD_DIR=os.environ.get("UPLOAD_DIR",os.path.abspath("uploads"))
    MAX_CONTENT_LENGTH=2*1024*1024
    FACULTY_EMAIL_DOMAIN=os.environ.get("FACULTY_EMAIL_DOMAIN","shanmugha.edu.in")
    SESSION_COOKIE_HTTPONLY=True; SESSION_COOKIE_SAMESITE="Lax"
    SMTP_HOST=os.environ.get("SMTP_HOST")
