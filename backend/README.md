# Smart Hostel Management System - Backend

Node.js + Express + MySQL REST API that powers the existing frontend (`frontend/`). The Express server also serves the frontend, so both run on one origin (http://localhost:3000) and the secure login cookie works without CORS.

## Architecture
```
Browser (existing HTML/CSS/JS)  --fetch /api/*-->  Express
   routes/        URL + role rules (authenticate, authorize)
   controllers/   validation, permission checks, response shaping
   models/        all SQL (parameterised queries only)
   middleware/    auth (JWT cookie), device key, error handler
   config/        MySQL connection pool + transaction helper
MySQL: students, users, rooms, room_allocations, biometric_events (protected by triggers),
       leaves, complaints, emergencies, notices, mess_menu, rules, audit_logs
```
- **Auth:** bcrypt (cost 12) password hashes; JWT in an `httpOnly`, `SameSite=Strict` cookie (`Secure` in production); login rate limit 10 per 15 min.
- **Roles:** `admin` (shown as Chairman in the UI), `warden` and `staff` (locked to one hostel), `student` (own records only).
- **Biometric attendance:** append-only. MySQL triggers reject UPDATE and DELETE; no API edits or deletes them. Hardware posts to `POST /api/biometric/events` with an `x-device-key` header.
- **Students are archived, not erased:** `DELETE /api/students/:id` archives. Permanent delete is admin-only and is refused if protected biometric history exists.

## Folder structure
```
smart-hostel/
  frontend/    index.html  style.css  script.js
  backend/
    server.js  package.json  .env.example  postman_collection.json
    config/database.js
    database/schema.sql
    routes/       auth users students rooms biometric attendance leaves complaints emergencies content
    controllers/  auth user student room attendance leave complaint emergency content dashboard bootstrap
    models/       User Student Room Attendance Leave Complaint Emergency Content Dashboard
    middleware/   auth.js deviceAuth.js error.js
    utils/        errors.js validate.js access.js
    scripts/      setup.js seedDemo.js makePostman.js
```

## Setup
1. Install Node.js 18+ and MySQL 8 (MariaDB 10.5+ also works).
2. Create the database user (run as MySQL root):
   ```sql
   CREATE DATABASE smart_hostel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'hostel_app'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
   GRANT ALL PRIVILEGES ON smart_hostel.* TO 'hostel_app'@'localhost';
   ```
3. Install and configure:
   ```bash
   cd backend
   npm install
   cp .env.example .env      # then edit .env
   ```
   Fill in `DB_PASSWORD`, `JWT_SECRET` (32+ random chars, e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`), `DEVICE_API_KEY` (16+ chars), `ADMIN_PASSWORD`. Never commit `.env`.
4. Create tables, triggers, defaults and the first admin: `npm run setup`
5. Optional demo data (8 students, rooms, wardens `wb`/`wg`, staff `sb`; password = `DEMO_PASSWORD`): `npm run seed:demo`
6. Start: `npm start` (or `npm run dev`), then open http://localhost:3000

If `npm run setup` fails creating triggers with error 1419 (binary logging), run setup with a privileged DB user or run `SET GLOBAL log_bin_trust_function_creators = 1;` as root.

## Frontend connection
`frontend/script.js` now loads data from `GET /api/bootstrap` after login (role-scoped, same shape the UI already used), and every form calls the matching API, then refreshes and shows a success or error message. The layout and design are unchanged; changes: demo login hint text replaced, "Reset demo data" button removed, small toast message added, staff tabs added.

## Endpoints (all JSON; cookie auth unless stated)
| Method & path | Roles | Purpose |
|---|---|---|
| POST /api/auth/login, GET /me, POST /logout, POST /change-password | any | session |
| GET/POST /api/users, PATCH /api/users/:id | admin | create admin/warden/staff, enable/disable, reset password |
| GET /api/students (filters: hostel, search, dept, year, status, roomNo, limit, offset) | admin, warden, staff | list/search |
| POST /api/students | admin, warden | add student + login + optional roomId |
| GET /api/students/:id | any (own for student) | view |
| PUT or PATCH /api/students/:id | admin, warden | update |
| DELETE /api/students/:id[?permanent=true] | admin, warden | archive / permanent delete (admin) |
| GET /api/rooms?hostel&available=true | admin, warden, staff | rooms with occupied/available |
| POST /api/rooms, PATCH/DELETE /api/rooms/:id | admin, warden | manage rooms |
| POST /api/rooms/allocate, /checkout; GET /history/:studentId | admin, warden | room check-in/out |
| POST /api/biometric/events | device key | hardware scan |
| POST /api/biometric/simulate | admin, warden | portal simulator |
| GET /api/attendance/events, /daily, /report | admin, warden, staff | attendance |
| GET /api/attendance/me | student | own attendance |
| POST /api/leaves | student | request |
| GET /api/leaves | any (scoped) | history |
| PATCH /api/leaves/:id/decision, POST /:id/depart | admin, warden | approve/reject, mark departed |
| POST/GET /api/complaints, PATCH /api/complaints/:id | student / scoped / staff+ | complaints |
| POST/GET /api/emergencies, PATCH /api/emergencies/:id | student / scoped / admin, warden | emergencies |
| GET/POST /api/notices, GET/PUT /api/mess-menu, GET /api/rules | scoped | content |
| GET /api/dashboard, GET /api/bootstrap | staff+ / any | counts / portal data |

Samples:
```
POST /api/auth/login       {"username":"wb","password":"..."}
 -> 200 {"message":"Login successful.","user":{"id":2,"username":"wb","role":"warden","fullName":"Boys' Hostel Warden","hostel":"Boys","studentId":null}}
POST /api/leaves           {"reason":"Home","departAt":"2026-11-14T08:00","returnAt":"2026-11-16T18:00","destination":"Erode"}
 -> 201 {"message":"Leave request submitted.","id":1}
PATCH /api/leaves/1/decision {"status":"Approved"}  -> 200 {"message":"Leave approved."}
GET /api/dashboard
 -> {"hostel":"All","students":{"total":8,"boys":4,"girls":4,...},"rooms":{"total":8,"occupied":8,"available":8,...},
     "attendanceToday":{"present":1,"absent":7,"onLeave":0},"pendingLeaves":0,"openComplaints":0,"openEmergencies":0,"overdueReturns":0}
```
Errors always look like `{"message":"..."}` with 400 validation, 401 not logged in, 403 not allowed, 404 not found, 409 conflict.

## Testing with Postman
1. Import `backend/postman_collection.json`. Set collection variables `baseUrl` (http://localhost:3000) and `deviceKey` (your DEVICE_API_KEY).
2. Run **1 Auth > POST /api/auth/login**. Postman keeps the cookie automatically for later requests.
3. Log in as different roles to test permissions (cookies are per session: log in again, or use another Postman cookie jar): student requests leave, warden approves, admin views dashboard.
4. Run folders in order 3 to 9. Try the failure cases: wrong password (401), a student calling /api/students (403), a warden touching the other hostel (403), a full room (409), deciding a leave twice (409).
5. For hardware, call **POST /api/biometric/events** with header `x-device-key`; no login needed.
6. To prove protection, run `DELETE FROM biometric_events LIMIT 1;` in MySQL: it fails with "Biometric records are protected".

## Production notes
Set `NODE_ENV=production`, `TRUST_PROXY=1` and serve over HTTPS (the cookie is Secure only in production). Use a unique strong `JWT_SECRET`, back up the database, and give the DB user only this schema.
