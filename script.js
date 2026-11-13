const KEY = 'smartHostelV1';
const $ = s => document.querySelector(s);
const now = () => new Date().toLocaleString();
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STATUSES = ['Inside', 'College', 'On Leave', 'Home', 'Absent'];

function seed() {
  const S = (id, name, g, dept, yr, room, phone, parent) => ({ id, name, gender: g, dept, year: yr, room, phone, parent, status: 'Inside' });
  return {
    students: [
      S('B001','Arun Kumar','Boys','CSE','2nd','B-101','9000000001','Mr. Kumar 9100000001'),
      S('B002','Vikram S','Boys','ECE','3rd','B-102','9000000002','Mr. Suresh 9100000002'),
      S('B003','Rahul M','Boys','MECH','1st','B-103','9000000003','Mr. Mani 9100000003'),
      S('B004','Karthik R','Boys','IT','4th','B-104','9000000004','Mr. Raja 9100000004'),
      S('G001','Priya Devi','Girls','CSE','2nd','G-201','9000000011','Mrs. Devi 9100000011'),
      S('G002','Anitha K','Girls','ECE','3rd','G-202','9000000012','Mr. Krish 9100000012'),
      S('G003','Meena L','Girls','CIVIL','1st','G-203','9000000013','Mr. Loga 9100000013'),
      S('G004','Divya P','Girls','IT','4th','G-204','9000000014','Mr. Prabhu 9100000014')
    ],
    events: [], leaves: [], complaints: [], emergencies: [], notices: [
      { id: 1, to: 'All', text: 'Welcome to the Smart Hostel portal.', time: now() }
    ],
    menu: {
      Breakfast: { time: '7:30 - 9:00', items: 'Idli, Sambar, Chutney' },
      Lunch: { time: '12:30 - 2:00', items: 'Rice, Dal, Veg Curry, Curd' },
      Snacks: { time: '4:30 - 5:30', items: 'Tea, Biscuits, Sundal' },
      Dinner: { time: '7:30 - 9:00', items: 'Chapati, Kurma, Rice' }
    },
    rules: ['Entry timing: students must be inside the hostel by 8:00 PM.',
      'Attendance is recorded automatically by biometric devices.',
      'Apply for leave through the portal before departure.',
      'Visitors are allowed only in the visitor area with approval.',
      'Keep rooms clean and report damage promptly.',
      'In emergencies contact the warden immediately.']
  };
}
let db;
try { db = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (e) { db = seed(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
const nid = arr => arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1;
const stu = id => db.students.find(s => s.id === id);

let user = null, tab = '';

const ACCOUNTS = {
  chairman: { pass: 'chair123', role: 'chairman', name: 'Chairman' },
  wb: { pass: 'warden123', role: 'warden', div: 'Boys', name: "Boys' Hostel Warden" },
  wg: { pass: 'warden123', role: 'warden', div: 'Girls', name: "Girls' Hostel Warden" }
};

function login() {
  const u = $('#u').value.trim(), p = $('#p').value;
  let acc = ACCOUNTS[u.toLowerCase()];
  if (acc && acc.pass === p) user = { ...acc };
  else {
    const s = stu(u.toUpperCase());
    if (s && p === '1234') user = { role: 'student', id: s.id, name: s.name, div: s.gender };
  }
  if (!user) { $('#err').textContent = 'Invalid username or password.'; return; }
  $('#err').textContent = '';
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
  $('#title').textContent = 'Smart Hostel - ' + user.role.toUpperCase() + ' PORTAL';
  $('#sub').textContent = user.name + (user.div ? ' (' + user.div + "' Hostel)" : '');
  tab = Object.keys(tabsFor())[0]; draw();
}
function logout() { user = null; $('#app').classList.add('hidden'); $('#login').classList.remove('hidden'); $('#p').value = ''; }

function tabsFor() {
  if (user.role === 'student') return { Profile: pProfile, Attendance: pAttendance, Leave: pLeave, Movement: pMovement, Mess: pMess, Complaints: pComplaints, Rules: pRules, Notices: pNotices, Emergency: pEmergency };
  if (user.role === 'warden') return { Dashboard: pDash, Students: pStudents, Biometric: pBio, Leaves: pLeaves, Complaints: pWComplaints, Mess: pMessEdit, Announce: pAnnounce };
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
  if (!r || !f || !t || !d) return alert('Please fill all fields.');
  if (new Date(t) <= new Date(f)) return alert('Return must be after departure.');
  db.leaves.push({ id: nid(db.leaves), sid: user.id, reason: r, from: f, to: t, dest: d, status: 'Pending' }); save(); draw();
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
  const d = $('#cd').value.trim(); if (!d) return alert('Describe your problem.');
  db.complaints.push({ id: nid(db.complaints), sid: user.id, cat: $('#cc').value, desc: d, status: 'Pending', time: now() }); save(); draw();
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
  if (!r || !d || !t) return alert('Please fill all fields.');
  db.emergencies.push({ id: nid(db.emergencies), sid: user.id, cat: $('#ec').value, reason: r, dest: d, ret: t, status: 'Pending', time: now() }); save(); draw();
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
  const id = $('#bs').value, t = $('#be').value, s = stu(id);
  const ev = { id: nid(db.events), sid: id, time: now(), device: 'BIO-' + (s.gender === 'Boys' ? 'B1' : 'G1'), type: t === 'FAIL' ? 'EXIT' : t, result: t === 'FAIL' ? 'FAILED' : 'SUCCESS' };
  db.events.push(Object.freeze(ev));
  if (ev.result === 'SUCCESS') {
    const onLeave = db.leaves.some(l => l.sid === id && l.status === 'Approved' && stu(id).status !== 'Inside');
    s.status = t === 'ENTRY' ? 'Inside' : (db.leaves.some(l => l.sid === id && l.status === 'Approved' && new Date(l.from) <= new Date() && new Date(l.to) >= new Date()) ? 'On Leave' : 'College');
  }
  save(); draw();
}
function pLeaves() {
  const L = db.leaves.filter(l => stu(l.sid).gender === user.div);
  return `<div class="card"><h2>Leave Requests</h2>${table(['Student', 'Reason', 'From', 'To', 'Destination', 'Status', 'Action'], L.slice().reverse().map(l => [esc(stu(l.sid).name), esc(l.reason), l.from, l.to, esc(l.dest), tag(overdue(l) ? 'Overdue' : l.status),
    l.status === 'Pending' ? `<button class="btn small ok" onclick="decide(${l.id},'Approved')">Approve</button> <button class="btn small bad" onclick="decide(${l.id},'Rejected')">Reject</button>` : (l.status === 'Approved' && stu(l.sid).status !== 'On Leave' ? `<button class="btn small" onclick="setLeave(${l.id})">Mark departed</button>` : '')]))}</div>`;
}
function decide(id, st) { db.leaves.find(l => l.id === id).status = st; save(); draw(); }
function setLeave(id) { stu(db.leaves.find(l => l.id === id).sid).status = 'On Leave'; save(); draw(); }
function pWComplaints() {
  const C = db.complaints.filter(c => stu(c.sid).gender === user.div);
  return `<div class="card"><h2>Complaints</h2>${table(['Student', 'Category', 'Description', 'Status', 'Update'], C.slice().reverse().map(c => [esc(stu(c.sid).name), c.cat, esc(c.desc), tag(c.status),
    `<select onchange="setC(${c.id},this.value)">${['Pending', 'In Progress', 'Resolved'].map(s => `<option ${s === c.status ? 'selected' : ''}>${s}</option>`).join('')}</select>`]))}</div>`;
}
function setC(id, v) { db.complaints.find(c => c.id === id).status = v; save(); draw(); }
function pMessEdit() {
  return `<div class="card"><h2>Edit Mess Menu</h2>${Object.entries(db.menu).map(([k, v]) => `<label>${k} (${v.time})</label><input id="m-${k}" value="${esc(v.items)}">`).join('')}<button class="btn" onclick="saveMenu()">Save menu</button></div>`;
}
function saveMenu() { Object.keys(db.menu).forEach(k => db.menu[k].items = $('#m-' + k).value); db.notices.push({ id: nid(db.notices), to: user.div, text: 'Mess menu has been updated.', time: now() }); save(); alert('Menu saved.'); }
function pAnnounce() {
  return `<div class="card"><h2>Send Announcement</h2><label>Message</label><textarea id="an" rows="3"></textarea><button class="btn" onclick="announce()">Send to ${user.div}' hostel</button></div>
  <div class="card"><h3>Sent</h3>${table(['Time', 'To', 'Message'], db.notices.filter(n => n.to === user.div).slice().reverse().map(n => [n.time, n.to, esc(n.text)]))}</div>`;
}
function announce() { const t = $('#an').value.trim(); if (!t) return; db.notices.push({ id: nid(db.notices), to: user.div, text: t, time: now() }); save(); draw(); }

/* ---------- chairman pages ---------- */
function pChair() {
  const od = db.leaves.filter(overdue), tot = db.students.length;
  return `<h2>Complete Hostel Overview</h2>${cards()}
  <div class="grid">${stat(list('Boys').length, 'Boys')}${stat(list('Girls').length, 'Girls')}${stat(new Set(db.students.map(s => s.room)).size, 'Occupied rooms')}${stat(db.emergencies.filter(e => e.status === 'Approved').length, 'Outside (emergency)')}</div>
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
function eSet(id, st) { db.emergencies.find(e => e.id === id).status = st; save(); draw(); }
function pReports() {
  const rows = db.students.map(s => {
    const ev = db.events.filter(e => e.sid === s.id && e.result === 'SUCCESS').length;
    return [s.id, esc(s.name), s.gender, s.room, ev, db.leaves.filter(l => l.sid === s.id && l.status === 'Approved').length, db.complaints.filter(c => c.sid === s.id).length, tag(s.status)];
  });
  return `<div class="card"><h2>Summary Report</h2>${table(['ID', 'Name', 'Hostel', 'Room', 'Verified scans', 'Leaves', 'Complaints', 'Status'], rows)}
  <button class="btn" onclick="csv()">Download CSV</button> <button class="btn" onclick="window.print()">Print</button>
  <button class="btn bad" onclick="resetDemo()">Reset demo data</button></div>`;
}
function csv() {
  const r = [['ID', 'Name', 'Hostel', 'Room', 'Status']].concat(db.students.map(s => [s.id, s.name, s.gender, s.room, s.status]));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([r.map(x => x.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n')], { type: 'text/csv' }));
  a.download = 'hostel-report.csv'; a.click();
}
function resetDemo() { if (confirm('Reset all demo data?')) { db = seed(); save(); draw(); } }

document.addEventListener('keydown', e => { if (e.key === 'Enter' && !user) login(); });
