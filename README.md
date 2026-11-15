# College Admission Management System (Flask)
## Run (Windows / VS Code)
```
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
cd backend && python run.py create-admin   # secure admin seed (no public admin signup)
python run.py                              # http://127.0.0.1:5000
```
Tests: `python -m pytest tests -q` (from project root).
## Config (`.env.example`)
SECRET_KEY, DATABASE_URL (postgresql://... works unchanged), FACULTY_EMAIL_DOMAIN, SMTP_HOST.
Email OTP/reset is NOT sent unless SMTP is configured; payments are SIMULATED (clearly labelled).
## API (all JSON `{success,data|error}`; non-GET needs `X-CSRF-Token` returned by login)
- `/api/auth`: POST register, login/<student|faculty|admin>, logout, forgot-password; GET me
- `/api/student`: GET/PUT application, GET courses, POST documents, GET documents/<kind>, POST payment, submit, GET notifications, allocation, POST allocation/<accept|decline>
- `/api/faculty`: GET applications[/id], documents/<id>/file; POST documents/<id>/verify, applications/<id>/review
- `/api/admin`: GET stats, applications, faculty; POST courses, faculty/<id>/approve, applications/<id>/assign, merit/calculate, merit/publish, allocate, applications/<id>/confirm, notify
## Integration
Register Blueprints from `backend/app/routes` in the main portal; tables are in `app/models`; swap `cur()` in `utils.py` for the portal's shared auth.
## Git workflow
`git checkout -b feature/admission` > `git add . && git commit -m "Admission module"` > `git push -u origin feature/admission` > open a Pull Request > review > merge into main.
