const $ = s => document.querySelector(s);
const now = () => new Date().toLocaleString();
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STATUSES = ['Inside', 'College', 'On Leave', 'Home', 'Absent'];

let db = { students: [], events: [], leaves: [], complaints: [], emergencies: [], notices: [], menu: {}, rules: [], dashboard: {} };

async function api(method, url, body) {
  const res = await fetch(url, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error(data.message || 'Request failed (' + res.status + ')'); err.status = res.status; throw err; }
  return data;
}
function toast(msg, bad) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 3500);
}
async function reload() { db = await api('GET', '/api/bootstrap'); }
async function act(fn, okMsg) {
  try { await fn(); await reload(); draw(); toast(okMsg); }
  catch (e) { if (e.status === 401) { logout(true); } toast(e.message, true); }
}
async function enter(u) {
  user = { role: u.role === 'admin' ? 'chairman' : u.role, id: u.studentId, name: u.fullName, div: u.hostel };
  try { await reload(); } catch (e) { user = null; throw e; }
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
  $('#title').textContent = 'Smart Hostel - ' + user.role.toUpperCase() + ' PORTAL';
  $('#sub').textContent = user.name + (user.div && user.role !== 'student' ? ' (' + user.div + "' Hostel)" : (user.div ? ' (' + user.div + "' Hostel)" : ''));
  tab = Object.keys(tabsFor())[0]; draw();
}
const stu = id => db.students.find(s => s.id === id);

let user = null, tab = '';


async function login() {
  const u = $('#u').value.trim(), p = $('#p').value;
  if (!u || !p) { $('#err').textContent = 'Enter username and password.'; return; }
  try { const r = await api('POST', '/api/auth/login', { username: u, password: p }); $('#err').textContent = ''; await enter(r.user); }
  catch (e) { $('#err').textContent = e.message; }
}
async function logout(silent) {
  if (silent !== true) { try { await api('POST', '/api/auth/logout'); } catch (e) {} }
  user = null; $('#app').classList.add('hidden'); $('#login').classList.remove('hidden'); $('#p').value = '';
}

function tabsFor() {
  if (user.role === 'student') return { Profile: pProfile, Attendance: pAttendance, Leave: pLeave, Movement: pMovement, Mess: pMess, Complaints: pComplaints, Rules: pRules, Notices: pNotices, Emergency: pEmergency };
  if (user.role === 'warden') return { Dashboard: pDash, Students: pStudents, Biometric: pBio, Leaves: pLeaves, Complaints: pWComplaints, Mess: pMessEdit, Announce: pAnnounce };
  if (user.role === 'staff') return { Dashboard: pDash, Students: pStudents, Complaints: pWComplaints, Mess: pMessEdit };
  return { Overview: pChair, Boys: () => pDash('Boys'), Girls: () => pDash('Girls'), Student: pLookup, Emergencies: pEmerg, Biometric: pBio, Reports: pReports };
}
function draw() {
  const tabs = tabsFor();
  $('#nav').innerHTML = Object.keys(tabs).map(t => `<button class="${t === tab ? 'on' : ''}" onclick="go('${t}')">${t}</button>`).join('');
  $('#view').innerHTML = tabs[tab]();
}
function go(t) { tab = t; draw(); }

/* ---------- helpers ---------- */
const table = (heads, rows) => `<div class="tw"><table><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr>${rows.length ? rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${heads.length}" class="muted">No records.</td></tr>`}</table></div>`;
const tag = s => `<span class="tag ${/Approved|Resolved|Inside|SUCCESS|Returned/.test(s) ? 'ok' : /Rejected|Absent|FAILED|Overdue/.test(s) ? 'bad' : 'warn'}">${esc(s)}</span>`;
const stat = (n, l) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`;
const list = div => db.students.filter(s => !div || s.gender === div);
const overdue = l => l.status === 'Approved' && new Date(l.to) < new Date() && stu(l.sid).status === 'On Leave';

function counts(div) {
  const L = list(div), c = n => L.filter(s => s.status === n).length;
  return { total: L.length, inside: c('Inside'), college: c('College'), leave: c('On Leave'), home: c('Home'), absent: c('Absent'),
    overdue: db.leaves.filter(l => overdue(l) && (!div || stu(l.sid).gender === div)).length };
}
function cards(div) {
  const c = counts(div);
  return `<div class="grid">${stat(c.total, 'Registered')}${stat(c.inside, 'Inside hostel')}${stat(c.college, 'Gone to college')}${stat(c.leave, 'On approved leave')}${stat(c.home, 'Gone home')}${stat(c.absent, 'Absent')}${stat(c.overdue, 'Return overdue')}</div>`;
}

/* ---------- student pages ---------- */
function pProfile() {
  const s = stu(user.id);
  return `<div class="two"><div class="card"><h2>My Profile</h2>${table(['Field', 'Value'], [
    ['Name', esc(s.name)], ['College ID', s.id], ['Department', s.dept], ['Year', s.year], ['Hostel', s.gender + "' Hostel"],
    ['Room', s.room], ['Mobile', s.phone], ['Parent/Guardian', esc(s.parent)], ['Status', tag(s.status)]])}</div>
    <div class="card"><h2>Digital ID Card</h2><div class="idcard"><b>${esc(s.name)}</b><div class="muted">${s.id} - ${s.gender}' Hostel</div><div class="qr"></div><small>Room ${s.room}</small></div></div></div>`;
}
function pAttendance() {
  const ev = db.events.filter(e => e.sid === user.id), ok = ev.filter(e => e.result === 'SUCCESS');
  return `<div class="card"><h2>My Biometric Attendance</h2><p class="muted">Records are automatic and cannot be edited by students or wardens.</p>
  <div class="grid">${stat(ok.length, 'Verified scans')}${stat(ev.length - ok.length, 'Failed scans')}</div>
  ${table(['Time', 'Event', 'Device', 'Result'], ev.slice().reverse().map(e => [e.time, e.type, e.device, tag(e.result)]))}</div>`;
}
function pLeave() {
  const mine = db.leaves.filter(l => l.sid === user.id);
  return `<div class="card"><h2>Apply for Leave</h2>
  <label>Reason</label><input id="lr"><label>Departure</label><input id="lf" type="datetime-local">
  <label>Expected return</label><input id="lt" type="datetime-local"><label>Destination</label><input id="ld">
  <button class="btn" onclick="applyLeave()">Submit request</button></div>
  <div class="card"><h2>My Leave History</h2>${table(['Reason', 'From', 'To', 'Destination', 'Status'], mine.map(l => [esc(l.reason), l.from, l.to, esc(l.dest), tag(l.status)]))}</div>`;
}
function applyLeave() {
  const r = $('#lr').value.trim(), f = $('#lf').value, t = $('#lt').value, d = $('#ld').value.trim();
  if (!r || !f || !t || !d) return toast('Please fill all fields.', true);
  if (new Date(t) <= new Date(f)) return toast('Return must be after departure.', true);
  act(() => api('POST', '/api/leaves', { reason: r, departAt: f, returnAt: t, destination: d }), 'Leave request submitted.');
}
function pMovement() {
  const s = stu(user.id), ev = db.events.filter(e => e.sid === user.id && e.result === 'SUCCESS');
  return `<div class="card"><h2>Entry / Exit Records</h2><p>Current status: ${tag(s.status)}</p>
  ${table(['Time', 'Movement', 'Device'], ev.slice().reverse().map(e => [e.time, e.type === 'EXIT' ? 'Hostel exit' : 'Hostel entry', e.device]))}</div>`;
}
function pMess() {
  return `<div class="card"><h2>Mess Menu</h2>${table(['Meal', 'Time', 'Items'], Object.entries(db.menu).map(([k, v]) => [k, v.time, esc(v.items)]))}</div>`;
}
function pComplaints() {
  const mine = db.complaints.filter(c => c.sid === user.id);
  return `<div class="card"><h2>Submit Complaint</h2><label>Category</label><select id="cc">${['Food quality', 'Drinking water', 'Room maintenance', 'Electricity', 'Bathroom & cleanliness', 'Wi-Fi', 'Furniture', 'Security', 'Other'].map(c => `<option>${c}</option>`).join('')}</select>
  <label>Description</label><textarea id="cd" rows="3"></textarea><button class="btn" onclick="addComplaint()">Submit</button></div>
  <div class="card"><h2>My Complaints</h2>${table(['Category', 'Description', 'Status'], mine.map(c => [c.cat, esc(c.desc), tag(c.status)]))}</div>`;
}
function addComplaint() {
  const d = $('#cd').value.trim(); if (!d) return toast('Describe your problem.', true);
  act(() => api('POST', '/api/complaints', { category: $('#cc').value, description: d }), 'Complaint submitted.');
}
const pRules = () => `<div class="card"><h2>Hostel Rules</h2><ol>${db.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ol></div>`;
function pNotices() {
  const n = db.notices.filter(x => x.to === 'All' || x.to === user.div);
  const my = db.leaves.filter(l => l.sid === user.id && l.status !== 'Pending').map(l => `Your leave to ${esc(l.dest)} was ${l.status}.`);
  return `<div class="card"><h2>Notifications</h2>${my.map(m => `<div class="alert">${m}</div>`).join('')}${n.slice().reverse().map(x => `<div class="alert"><b>${esc(x.text)}</b><div class="muted">${x.time}</div></div>`).join('')}</div>`;
}
function pEmergency() {
  const mine = db.emergencies.filter(e => e.sid === user.id), w = user.div === 'Boys' ? 'Boys warden: 9800000001' : 'Girls warden: 9800000002';
  return `<div class="card"><h2>Emergency Assistance</h2><p>${w} | Hostel office: 9800000000 | Ambulance: 108</p>
  <label>Category</label><select id="ec">${['Medical emergency', 'Hospital visit', 'Family emergency', 'Personal emergency', 'Unexpected travel home'].map(c => `<option>${c}</option>`).join('')}</select>
  <label>Reason</label><input id="er"><label>Destination</label><input id="ed"><label>Expected return</label><input id="et" type="datetime-local">
  <button class="btn bad" onclick="addEmerg()">Send emergency request</button></div>
  <div class="card"><h3>My requests</h3>${table(['Category', 'Reason', 'Destination', 'Status'], mine.map(e => [e.cat, esc(e.reason), esc(e.dest), tag(e.status)]))}</div>`;
}
function addEmerg() {
  const r = $('#er').value.trim(), d = $('#ed').value.trim(), t = $('#et').value;
  if (!r || !d || !t) return toast('Please fill all fields.', true);
  act(() => api('POST', '/api/emergencies', { category: $('#ec').value, reason: r, destination: d, expectedReturn: t }), 'Emergency request sent.');
}

/* ---------- warden pages ---------- */
function pDash(div) {
  const d = typeof div === 'string' ? div : user.div;
  const pl = db.leaves.filter(l => l.status === 'Pending' && stu(l.sid).gender === d).length;
  const pc = db.complaints.filter(c => c.status !== 'Resolved' && stu(c.sid).gender === d).length;
  const pe = db.emergencies.filter(e => e.status !== 'Returned' && e.status !== 'Rejected' && stu(e.sid).gender === d).length;
  const od = db.leaves.filter(l => overdue(l) && stu(l.sid).gender === d);
  return `<h2>${d}' Hostel Dashboard</h2>${cards(d)}<div class="grid">${stat(pl, 'Pending leaves')}${stat(pc, 'Open complaints')}${stat(pe, 'Emergency cases')}</div>
  ${od.length ? `<div class="card"><h3>Missing return alerts</h3>${od.map(l => `<div class="alert">${esc(stu(l.sid).name)} (${l.sid}) expected back ${l.to}</div>`).join('')}</div>` : ''}`;
}
function pStudents() {
  return `<div class="card"><h2>Student Database</h2>${table(['ID', 'Name', 'Dept/Year', 'Room', 'Mobile', 'Parent', 'Status'], list(user.div).map(s => [s.id, esc(s.name), s.dept + ' / ' + s.year, s.room, s.phone, esc(s.parent), tag(s.status)]))}</div>`;
}
function pBio() {
  const own = user.role === 'warden' ? user.div : null;
  const ev = db.events.filter(e => !own || stu(e.sid).gender === own);
  const opts = list(own).map(s => `<option value="${s.id}">${s.id} - ${esc(s.name)}</option>`).join('');
  return `<div class="card"><h2>Biometric Device (Demo Simulator)</h2><p class="muted">Simulates a scan. Records are append-only: no edit or delete is available.</p>
  <div class="two"><div><label>Student</label><select id="bs">${opts}</select></div><div><label>Event</label><select id="be"><option value="EXIT">Hostel exit</option><option value="ENTRY">Hostel entry</option><option value="FAIL">Failed scan</option></select></div></div>
  <button class="btn" onclick="scan()">Simulate scan</button></div>
  <div class="card"><h3>Attendance log (read-only)</h3>${table(['Time', 'ID', 'Name', 'Event', 'Device', 'Result'], ev.slice().reverse().map(e => [e.time, e.sid, esc(stu(e.sid).name), e.type, e.device, tag(e.result)]))}</div>`;
}
function scan() {
  const id = $('#bs').value, t = $('#be').value;
  act(() => api('POST', '/api/biometric/simulate', { studentId: id, event: t }), t === 'FAIL' ? 'Failed scan recorded.' : 'Scan recorded.');
}
function pLeaves() {
  const L = db.leaves.filter(l => stu(l.sid).gender === user.div);
  return `<div class="card"><h2>Leave Requests</h2>${table(['Student', 'Reason', 'From', 'To', 'Destination', 'Status', 'Action'], L.slice().reverse().map(l => [esc(stu(l.sid).name), esc(l.reason), l.from, l.to, esc(l.dest), tag(overdue(l) ? 'Overdue' : l.status),
    l.status === 'Pending' ? `<button class="btn small ok" onclick="decide(${l.id},'Approved')">Approve</button> <button class="btn small bad" onclick="decide(${l.id},'Rejected')">Reject</button>` : (l.status === 'Approved' && stu(l.sid).status !== 'On Leave' ? `<button class="btn small" onclick="setLeave(${l.id})">Mark departed</button>` : '')]))}</div>`;
}
function decide(id, st) { act(() => api('PATCH', '/api/leaves/' + id + '/decision', { status: st }), 'Leave ' + st.toLowerCase() + '.'); }
function setLeave(id) { act(() => api('POST', '/api/leaves/' + id + '/depart'), 'Student marked as on leave.'); }
function pWComplaints() {
  const C = db.complaints.filter(c => stu(c.sid).gender === user.div);
  return `<div class="card"><h2>Complaints</h2>${table(['Student', 'Category', 'Description', 'Status', 'Update'], C.slice().reverse().map(c => [esc(stu(c.sid).name), c.cat, esc(c.desc), tag(c.status),
    `<select onchange="setC(${c.id},this.value)">${['Pending', 'In Progress', 'Resolved'].map(s => `<option ${s === c.status ? 'selected' : ''}>${s}</option>`).join('')}</select>`]))}</div>`;
}
function setC(id, v) { act(() => api('PATCH', '/api/complaints/' + id, { status: v }), 'Complaint updated.'); }
function pMessEdit() {
  return `<div class="card"><h2>Edit Mess Menu</h2>${Object.entries(db.menu).map(([k, v]) => `<label>${k} (${v.time})</label><input id="m-${k}" value="${esc(v.items)}">`).join('')}<button class="btn" onclick="saveMenu()">Save menu</button></div>`;
}
function saveMenu() { const b = {}; Object.keys(db.menu).forEach(k => b[k] = { items: $('#m-' + k).value }); act(() => api('PUT', '/api/mess-menu', b), 'Mess menu saved.'); }
function pAnnounce() {
  return `<div class="card"><h2>Send Announcement</h2><label>Message</label><textarea id="an" rows="3"></textarea><button class="btn" onclick="announce()">Send to ${user.div}' hostel</button></div>
  <div class="card"><h3>Sent</h3>${table(['Time', 'To', 'Message'], db.notices.filter(n => n.to === user.div).slice().reverse().map(n => [n.time, n.to, esc(n.text)]))}</div>`;
}
function announce() { const t = $('#an').value.trim(); if (!t) return toast('Enter a message.', true); act(() => api('POST', '/api/notices', { message: t }), 'Announcement sent.'); }

/* ---------- chairman pages ---------- */
function pChair() {
  const od = db.leaves.filter(overdue), tot = db.students.length;
  return `<h2>Complete Hostel Overview</h2>${cards()}
  <div class="grid">${stat(list('Boys').length, 'Boys')}${stat(list('Girls').length, 'Girls')}${stat(((db.dashboard.rooms || {}).occupied || 0), 'Occupied rooms')}${stat(db.emergencies.filter(e => e.status === 'Approved').length, 'Outside (emergency)')}</div>
  <div class="card"><h3>Morning status</h3><p>Verified exits today: <b>${db.events.filter(e => e.type === 'EXIT' && e.result === 'SUCCESS').length}</b> of ${tot}. Failed/missing scans needing verification: <b>${db.events.filter(e => e.result === 'FAILED').length}</b>.</p>
  <p class="muted">Leaving the hostel does not mean college arrival; that needs a separate college verification.</p></div>
  <div class="card"><h3>Missing return alerts</h3>${od.length ? od.map(l => `<div class="alert">${esc(stu(l.sid).name)} (${l.sid}) was due ${l.to}</div>`).join('') : '<p class="muted">No alerts.</p>'}</div>`;
}
function pLookup() {
  return `<div class="card"><h2>Individual Student Monitoring</h2><label>Student</label><select id="ls" onchange="showStu()"><option value="">Select...</option>${db.students.map(s => `<option value="${s.id}">${s.id} - ${esc(s.name)}</option>`).join('')}</select><div id="lres"></div></div>`;
}
function showStu() {
  const s = stu($('#ls').value); if (!s) { $('#lres').innerHTML = ''; return; }
  const ev = db.events.filter(e => e.sid === s.id), lv = db.leaves.filter(l => l.sid === s.id);
  $('#lres').innerHTML = `<h3>${esc(s.name)} ${tag(s.status)}</h3><p>${s.gender}' Hostel | Room ${s.room} | ${s.dept} ${s.year} yr | ${s.phone} | Parent: ${esc(s.parent)}</p>
  <h3>Biometric history</h3>${table(['Time', 'Event', 'Result'], ev.slice().reverse().map(e => [e.time, e.type, tag(e.result)]))}
  <h3>Leave history</h3>${table(['Reason', 'From', 'To', 'Status'], lv.map(l => [esc(l.reason), l.from, l.to, tag(l.status)]))}`;
}
function pEmerg() {
  const E = db.emergencies, c = st => E.filter(e => e.status === st).length;
  return `<div class="grid">${stat(E.length, 'Total cases')}${stat(c('Pending'), 'Pending')}${stat(c('Approved'), 'Currently outside')}${stat(c('Returned'), 'Returned')}</div>
  <div class="card"><h2>Emergency Requests</h2>${table(['Student', 'Hostel', 'Category', 'Reason', 'Destination', 'Return by', 'Status', 'Action'], E.slice().reverse().map(e => [esc(stu(e.sid).name), stu(e.sid).gender, e.cat, esc(e.reason), esc(e.dest), e.ret, tag(e.status),
    e.status === 'Pending' ? `<button class="btn small ok" onclick="eSet(${e.id},'Approved')">Approve</button>` : e.status === 'Approved' ? `<button class="btn small" onclick="eSet(${e.id},'Returned')">Mark returned</button>` : '']))}</div>`;
}
function eSet(id, st) { act(() => api('PATCH', '/api/emergencies/' + id, { status: st }), 'Emergency ' + st.toLowerCase() + '.'); }
function pReports() {
  const rows = db.students.map(s => {
    const ev = db.events.filter(e => e.sid === s.id && e.result === 'SUCCESS').length;
    return [s.id, esc(s.name), s.gender, s.room, ev, db.leaves.filter(l => l.sid === s.id && l.status === 'Approved').length, db.complaints.filter(c => c.sid === s.id).length, tag(s.status)];
  });
  return `<div class="card"><h2>Summary Report</h2>${table(['ID', 'Name', 'Hostel', 'Room', 'Verified scans', 'Leaves', 'Complaints', 'Status'], rows)}
  <button class="btn" onclick="csv()">Download CSV</button> <button class="btn" onclick="window.print()">Print</button>
 </div>`;
}
function csv() {
  const r = [['ID', 'Name', 'Hostel', 'Room', 'Status']].concat(db.students.map(s => [s.id, s.name, s.gender, s.room, s.status]));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([r.map(x => x.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n')], { type: 'text/csv' }));
  a.download = 'hostel-report.csv'; a.click();
}

document.addEventListener('keydown', e => { if (e.key === 'Enter' && !user) login(); });

// Restore an existing session (secure cookie) after a page refresh
api('GET', '/api/auth/me').then(r => enter(r.user)).catch(() => {});
