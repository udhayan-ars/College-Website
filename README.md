# NEXORA Educational Institution Portal

The backend serves the NEXORA main portal at `/` and keeps the four existing workspaces in their own paths:

- Smart Hostel: `/hostel/` (uses the existing Smart Hostel user login)
- CampusTrack: `/modules/campustrack/`
- Admission Management: `/admission/`
- Canteen Management: `/modules/canteen_management/`

## Portal access setup

The portal accepts these usernames (case-insensitive): `udhayan`, `yogamithran`, `deepasri`, and `dhiviya`. The shared password is never stored in frontend code. Set `PORTAL_PASSWORD_HASH` in `backend/.env` to a bcrypt hash generated locally:

```bash
cd backend
node scripts/hashPortalPassword.js
```

Copy the printed `PORTAL_PASSWORD_HASH=...` line into `backend/.env`. Do not share the hash or `.env` file. The portal uses a separate HTTP-only session cookie and does not replace Smart Hostel authentication.

## Run

```bash
cd backend
npm install
npm start
```

Open `http://localhost:3000/`. The backend requires its existing MySQL settings and JWT/device secrets in `backend/.env`. Admission, CampusTrack and Canteen paths require a valid NEXORA portal session. Smart Hostel keeps its existing independent login at `/hostel/`.
