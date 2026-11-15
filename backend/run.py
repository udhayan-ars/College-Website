import sys,os,getpass
from app import create_app
from app.extensions import db
from app.models import User
from werkzeug.security import generate_password_hash as gh
app=create_app()
if len(sys.argv)>1 and sys.argv[1]=="create-admin":
    with app.app_context():
        e=input("Admin email: "); pw=getpass.getpass("Password (8+): ")
        db.session.add(User(email=e,name="Administrator",role="admin",code="ADM001",password_hash=gh(pw))); db.session.commit(); print("Admin created")
elif __name__=="__main__": app.run(debug=os.environ.get("FLASK_DEBUG")=="1")
