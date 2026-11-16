
let role = 'student', csrf = '', reg = false, U;

const $ = id => document.getElementById(id);

async function api(url, method = 'GET', body, form) {
    const options = {
        method,
        headers: { 'X-CSRF-Token': csrf }
    };

    if (form) options.body = form;
    else if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
        alert(result.error || 'Something went wrong');
        throw result;
    }

    return result.data;
}

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
}[c]));

const card = html => `<div class="card p-3 mb-3">${html}</div>`;

const badge = value => {
    const v = String(value || 'N/A');
    const lower = v.toLowerCase();
    const color = lower.includes('approv') || lower.includes('paid') ||
        lower.includes('eligible') || lower.includes('accept') ||
        lower.includes('issued') ? 'success' :
        lower.includes('reject') || lower.includes('declin') ||
        lower.includes('fail') ? 'danger' :
        lower.includes('pending') || lower.includes('review') ||
        lower.includes('process') ? 'warning' : 'primary';

    return `<span class="badge text-bg-${color}">${esc(v)}</span>`;
};

const tbl = (headers, rows) => `
<div class="table-responsive">
<table class="table table-bordered table-hover bg-white align-middle">
<thead class="table-light"><tr>
${headers.map(h => `<th>${esc(h)}</th>`).join('')}
</tr></thead>
<tbody>
${rows.length ? rows.map(row => `<tr>${row.map(cell =>
    `<td>${cell ?? ''}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}" class="text-center text-muted py-4">No records found</td></tr>`}
</tbody></table></div>`;


/* =====================================================
   COMMON STUDENT UI HELPERS
===================================================== */

function studentStyles() {
    return `
    <style>
        .st-page { color:#263754; width:100%; }
        .st-hero {
            background:linear-gradient(115deg,#203d78,#315fbd);
            color:white; padding:25px; border-radius:17px;
            margin-bottom:20px; box-shadow:0 6px 20px rgba(32,61,120,.10);
        }
        .st-hero h3 { font-weight:700; margin-bottom:7px; }
        .st-hero p { color:#e0e9ff; margin:0; }
        .st-hero-icon { font-size:43px; opacity:.85; }
        .st-panel {
            background:white; border:1px solid #e6ebf3;
            border-radius:15px; padding:21px; margin-bottom:18px;
            box-shadow:0 5px 20px rgba(25,40,70,.04);
        }
        .st-panel h5,.st-panel h6 {
            color:#203d78; font-weight:700;
        }
        .st-panel-title {
            color:#203d78; font-size:17px; font-weight:700;
            padding-bottom:13px; margin-bottom:15px;
            border-bottom:1px solid #edf0f5;
        }
        .st-label {
            display:block; font-size:12px; color:#8791a4;
            margin-bottom:6px; font-weight:600;
        }
        .st-value { color:#263754; font-weight:700; overflow-wrap:anywhere; }
        .st-stat {
            background:white; border:1px solid #e6ebf3;
            border-radius:14px; padding:17px; height:100%;
            box-shadow:0 4px 15px rgba(25,40,70,.04);
        }
        .st-stat-icon {
            width:42px;height:42px;border-radius:12px;
            display:flex;align-items:center;justify-content:center;
            background:#edf2ff;color:#315fbd;font-size:21px;margin-bottom:12px;
        }
        .st-stat small { color:#8791a4; }
        .st-stat h4 { font-weight:750;color:#203d78;margin:5px 0 0; }
        .st-row {
            display:flex;justify-content:space-between;align-items:center;
            gap:12px;padding:13px 0;border-bottom:1px solid #edf0f5;
        }
        .st-row:last-child { border-bottom:0; }
        .st-row span:first-child { color:#8791a4; }
        .st-row strong { text-align:right;overflow-wrap:anywhere; }
        .st-action {
            border:1px solid #dfe7f5;background:#f7f9ff;
            color:#203d78;border-radius:10px;padding:10px 15px;
            font-weight:600;transition:.2s;
        }
        .st-action:hover { background:#eaf0ff;border-color:#315fbd; }
        .st-form label { font-size:13px;font-weight:600;color:#52617a;margin-bottom:6px; }
        .st-form .form-control,.st-form .form-select {
            border-color:#dfe5ef;border-radius:9px;padding:10px 12px;
        }
        .st-form .form-control:focus,.st-form .form-select:focus {
            border-color:#315fbd;box-shadow:0 0 0 .2rem rgba(49,95,189,.12);
        }
        .st-primary {
            background:#244783!important;border-color:#244783!important;
            color:white!important;border-radius:9px;font-weight:600;padding:9px 17px;
        }
        .st-primary:hover { background:#315fbd!important; }
        .st-item {
            border:1px solid #e6ebf3;border-radius:12px;
            padding:16px;background:white;margin-bottom:12px;
        }
        .st-item:hover { border-color:#b8c9ed; }
        .st-icon {
            width:43px;height:43px;border-radius:11px;
            display:flex;align-items:center;justify-content:center;
            background:#edf2ff;color:#315fbd;font-size:21px;flex-shrink:0;
        }
        .st-empty {
            text-align:center;padding:28px 15px;color:#8791a4;
            background:#f8faff;border:1px dashed #d7e0ef;border-radius:12px;
        }
        .st-empty i { font-size:32px;display:block;color:#9aafd9;margin-bottom:9px; }
        .st-progress {
            height:9px;background:#e9eef7;border-radius:20px;overflow:hidden;
        }
        .st-progress > div {
            height:100%;background:linear-gradient(90deg,#315fbd,#6d91df);
            border-radius:20px;
        }
        .st-table thead th {
            background:#f1f5fc;color:#294775;white-space:nowrap;
        }
        .st-table td { vertical-align:middle; }
        .st-timeline {
            border-left:2px solid #dce6f7;margin-left:8px;padding-left:20px;
        }
        .st-timeline-item { position:relative;padding-bottom:20px; }
        .st-timeline-item:before {
            content:'';position:absolute;left:-27px;top:4px;
            width:12px;height:12px;background:#315fbd;
            border:3px solid #e6edfb;border-radius:50%;
        }
        .st-ticket {
            border:1px dashed #aabce0;border-radius:15px;
            background:linear-gradient(135deg,#f7f9ff,#fff);
            padding:22px;
        }
        @media(max-width:600px) {
            .st-hero { padding:19px; }
            .st-hero h3 { font-size:21px; }
            .st-panel { padding:16px; }
            .st-row { font-size:13px; }
            .st-stat { padding:13px; }
        }
    </style>`;
}

function stPage(title, subtitle, icon, content) {
    $('main').innerHTML = studentStyles() + `
        <div class="st-page">
            <section class="st-hero">
                <div class="row align-items-center">
                    <div class="col-9">
                        <p class="small mb-2">STUDENT PORTAL</p>
                        <h3>${title}</h3>
                        <p>${subtitle}</p>
                    </div>
                    <div class="col-3 text-end">
                        <i class="bi ${icon} st-hero-icon"></i>
                    </div>
                </div>
            </section>
            ${content}
        </div>`;
}

function stPanel(title, content, icon = 'bi-grid') {
    return `<section class="st-panel">
        <div class="st-panel-title"><i class="bi ${icon} me-2"></i>${title}</div>
        ${content}
    </section>`;
}

function stStat(label, value, icon) {
    return `<div class="col-6 col-lg-3">
        <div class="st-stat">
            <div class="st-stat-icon"><i class="bi ${icon}"></i></div>
            <small>${label}</small>
            <h4>${esc(value)}</h4>
        </div>
    </div>`;
}

function stEmpty(message, icon = 'bi-inbox') {
    return `<div class="st-empty"><i class="bi ${icon}"></i>${message}</div>`;
}

function stField(label, id, value = '', type = 'text', placeholder = '') {
    return `<div class="mb-3">
        <label for="${id}">${label}</label>
        <input id="${id}" type="${type}" class="form-control"
            value="${esc(value)}" placeholder="${placeholder}">
    </div>`;
}


/* =====================================================
   AUTHENTICATION
===================================================== */

function setRole(newRole) {
    role = newRole;
    reg = false;

    document.querySelectorAll('.role-button').forEach(button => {
        button.classList.toggle('active', button.dataset.role === newRole);
    });

    draw();
}

function draw() {
    $('ttl').textContent =
        role[0].toUpperCase() + role.slice(1) +
        (reg ? ' Registration' : ' Login');

    $('rl').style.display = role === 'admin' ? 'none' : '';

    $('regf').innerHTML = !reg ? '' :
        `<input id="name" class="form-control mb-2" placeholder="Full name">` +
        (role === 'student'
            ? `<input id="dob" type="date" class="form-control mb-2">
               <select id="gender" class="form-select mb-2">
                 <option>Male</option><option>Female</option><option>Other</option>
               </select>
               <input id="mobile" class="form-control mb-2" placeholder="Mobile">`
            : `<input id="fid" class="form-control mb-2" placeholder="Faculty ID">
               <input id="dept" class="form-control mb-2" placeholder="Department">
               <input id="desg" class="form-control mb-2" placeholder="Designation">`) +
        `<input id="cf" type="password" class="form-control mb-2" placeholder="Confirm password">`;
}

function toggleReg() {
    reg = !reg;
    draw();
}

async function forgot() {
    try {
        const result = await api('/api/auth/forgot-password', 'POST', {
            email: $('email').value
        });
        alert(result.message);
    } catch (e) {}
}

async function login() {
    $('msg').textContent = '';

    try {
        if (reg) {
            const value = id => $(id)?.value;

            const result = await api('/api/auth/register', 'POST', {
                role,
                name: value('name'),
                email: value('email'),
                password: value('pw'),
                confirm: value('cf'),
                dob: value('dob'),
                gender: value('gender'),
                mobile: value('mobile'),
                faculty_id: value('fid'),
                department: value('dept'),
                designation: value('desg')
            });

            alert(result.application_number
                ? 'Registered. Application No: ' + result.application_number
                : result.message);

            reg = false;
            draw();
            return;
        }

        U = await api('/api/auth/login/' + role, 'POST', {
            email: $('email').value,
            password: $('pw').value
        });

        csrf = U.csrf;
        start();

    } catch (e) {
        $('msg').textContent = e.error || 'Login failed';
    }
}

function togglePassword() {
    const password = $('pw');
    const button = $('pwToggle');

    if (password.type === 'password') {
        password.type = 'text';
        button.innerHTML = '<i class="bi bi-eye-slash"></i>';
    } else {
        password.type = 'password';
        button.innerHTML = '<i class="bi bi-eye"></i>';
    }
}


/* =====================================================
   ROLE MENUS
===================================================== */

const SV = {
    student: [
        'Dashboard', 'Profile & ID', 'Application',
        'Academic Details', 'Documents', 'Admission Fee',
        'Attendance', 'Internal Marks', 'Results',
        'Exam Timetable', 'Hall Tickets', 'Fees',
        'Leave Application', 'Scholarships',
        'Certificate Requests', 'Grievances',
        'Library', 'Notifications', 'Merit & Seat'
    ],
    faculty: ['Assigned Applications'],
    admin: ['Dashboard', 'Courses', 'Applications', 'Faculty', 'Merit & Seats', 'Announce']
};

function start() {
    $('auth').classList.add('d-none');
    $('app').classList.remove('d-none');

    $('pn').textContent = U.name;
    $('pi').innerHTML =
        esc(U.role) +
        (U.code ? ' | ' + esc(U.code) : '') +
        (U.department ? '<br>' + esc(U.department) : '');

    $('nav').innerHTML = SV[role].map((item, index) =>
        `<button class="btn" onclick="go('${item}',this)">
            ${index === 0 ? '<i class="bi bi-grid"></i>' : '<i class="bi bi-chevron-right"></i>'}
            ${esc(item)}
        </button>`
    ).join('');

    go(SV[role][0], $('nav').querySelector('button'));
}

async function go(page, button) {
    document.querySelectorAll('#nav .btn')
        .forEach(item => item.classList.toggle('on', item === button));

    $('ph').textContent = page;
    $('main').innerHTML = '<div class="spinner-border text-primary"></div>';

    try {
        await V[role][page]();
    } catch (error) {
        $('main').innerHTML = card(
            `<div class="text-danger">Unable to load this page. Please try again.</div>`
        );
        console.error(error);
    }
}


/* =====================================================
   STUDENT PORTAL
===================================================== */

const V = {

student: {

    /* DASHBOARD - KEEPING EXISTING DESIGN */

    async Dashboard() {
        const d = await api('/api/student/dashboard');

        const attendance = d.attendance_percentage == null
            ? '—'
            : esc(d.attendance_percentage) + '%';

        const stats = [
            { label:'My Course', value:d.course || 'Not allotted', icon:'bi-mortarboard', color:'#4779e6' },
            { label:'Attendance', value:attendance, icon:'bi-calendar-check', color:'#24a477' },
            { label:'Total Subjects', value:d.subject_count ?? 0, icon:'bi-book', color:'#9b70dc' },
            { label:'Pending Fees', value:d.pending_fees ?? 0, icon:'bi-wallet2', color:'#e59b38' }
        ];

        $('main').innerHTML = `
            <style>
                .sd-wrap { color:#1d2b45;width:100%; }
                .sd-welcome {
                    background:linear-gradient(115deg,#203d78,#315fbd);
                    color:white;padding:28px;border-radius:18px;
                    margin-bottom:22px;position:relative;overflow:hidden;
                }
                .sd-welcome h3 { font-weight:700; }
                .sd-welcome p { color:#e0e9ff; }
                .sd-welcome-icon { font-size:75px;opacity:.2; }
                .sd-stats {
                    display:grid;grid-template-columns:repeat(4,minmax(0,1fr));
                    gap:16px;margin-bottom:22px;
                }
                .sd-stat {
                    background:white;border:1px solid #e6ebf3;
                    border-radius:15px;padding:20px;
                    box-shadow:0 5px 20px rgba(25,40,70,.05);
                    min-width:0;transition:transform .2s,box-shadow .2s;
                }
                .sd-stat:hover {
                    transform:translateY(-3px);
                    box-shadow:0 8px 25px rgba(25,40,70,.09);
                }
                .sd-stat-icon {
                    width:43px;height:43px;border-radius:12px;
                    display:flex;align-items:center;justify-content:center;
                    font-size:21px;margin-bottom:15px;
                }
                .sd-stat h4 { font-size:21px;font-weight:700;overflow-wrap:anywhere; }
                .sd-stat small { color:#8791a4; }
                .sd-panel {
                    background:white;border:1px solid #e6ebf3;
                    border-radius:15px;padding:22px;
                    box-shadow:0 5px 20px rgba(25,40,70,.04);height:100%;
                }
                .sd-panel h5 { font-weight:700;color:#203d78; }
                .sd-info {
                    display:flex;justify-content:space-between;
                    align-items:center;gap:10px;padding:13px 0;
                    border-bottom:1px solid #edf0f5;
                }
                .sd-info:last-child { border:0; }
                .sd-info span:first-child { color:#8791a4; }
                .sd-info strong { text-align:right;overflow-wrap:anywhere; }
                .sd-actions {
                    display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
                    gap:12px;margin-top:18px;
                }
                .sd-action {
                    border:1px solid #e6ebf3;background:#f8faff;
                    color:#203d78;padding:15px;border-radius:12px;
                    text-align:left;font-weight:600;transition:.2s;cursor:pointer;
                }
                .sd-action:hover {
                    background:#eaf0ff;border-color:#315fbd;transform:translateY(-2px);
                }
                .sd-action i { display:block;font-size:22px;margin-bottom:8px; }
                @media(max-width:900px) {
                    .sd-stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
                }
                @media(max-width:500px) {
                    .sd-welcome { padding:20px; }
                    .sd-welcome h3 { font-size:21px; }
                    .sd-welcome-icon { font-size:48px; }
                    .sd-stats { gap:10px; }
                    .sd-stat { padding:14px; }
                    .sd-stat h4 { font-size:17px; }
                    .sd-panel { padding:16px; }
                    .sd-actions { grid-template-columns:1fr; }
                    .sd-info { font-size:13px; }
                }
            </style>

            <div class="sd-wrap">
                <section class="sd-welcome">
                    <div class="row align-items-center">
                        <div class="col-9">
                            <p class="mb-2">STUDENT PORTAL</p>
                            <h3>Welcome back, ${esc(d.name || U.name)}!</h3>
                            <p class="mb-0">Here's your academic and admission overview.</p>
                        </div>
                        <div class="col-3 text-end">
                            <i class="bi bi-mortarboard-fill sd-welcome-icon"></i>
                        </div>
                    </div>
                </section>

                <div class="sd-stats">
                    ${stats.map(s => `
                        <div class="sd-stat">
                            <div class="sd-stat-icon" style="background:${s.color}18;color:${s.color}">
                                <i class="bi ${s.icon}"></i>
                            </div>
                            <small>${esc(s.label)}</small>
                            <h4 class="mt-2 mb-0">${esc(s.value)}</h4>
                        </div>`).join('')}
                </div>

                <div class="row g-3">
                    <div class="col-lg-6">
                        <div class="sd-panel">
                            <h5><i class="bi bi-person-vcard text-primary me-2"></i>Admission Overview</h5>
                            <div class="sd-info"><span>Admission Status</span><strong>${badge(d.admission_status)}</strong></div>
                            <div class="sd-info"><span>Register Number</span><strong>${esc(d.register_no || 'Not allotted')}</strong></div>
                            <div class="sd-info"><span>Department</span><strong>${esc(d.department || 'Not assigned')}</strong></div>
                            <div class="sd-info"><span>Course</span><strong>${esc(d.course || 'Not allotted')}</strong></div>
                        </div>
                    </div>

                    <div class="col-lg-6">
                        <div class="sd-panel">
                            <h5><i class="bi bi-lightning-charge text-primary me-2"></i>Quick Actions</h5>
                            <div class="sd-actions">
                                <button class="sd-action" onclick="openStudentPage('Application')"><i class="bi bi-file-earmark-text"></i>My Application</button>
                                <button class="sd-action" onclick="openStudentPage('Documents')"><i class="bi bi-cloud-arrow-up"></i>Upload Documents</button>
                                <button class="sd-action" onclick="openStudentPage('Attendance')"><i class="bi bi-calendar-check"></i>View Attendance</button>
                                <button class="sd-action" onclick="openStudentPage('Fees')"><i class="bi bi-wallet2"></i>Fee Details</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    },


    /* PROFILE & ID - KEEPING EXISTING DESIGN */

    async 'Profile & ID'() {
        const p = await api('/api/student/profile');
        const name = p.name || U.name || 'Student';
        const initial = name.trim().charAt(0).toUpperCase();

        $('main').innerHTML = `
            <style>
                .profile-wrap { color:#20304b;width:100%; }
                .profile-header {
                    background:linear-gradient(115deg,#203d78,#315fbd);
                    color:white;padding:28px;border-radius:17px;margin-bottom:22px;
                    display:flex;align-items:center;gap:22px;flex-wrap:wrap;
                    box-shadow:0 6px 20px rgba(32,61,120,.12);
                }
                .profile-avatar {
                    width:85px;height:85px;min-width:85px;border-radius:50%;
                    background:white;color:#203d78;display:flex;
                    align-items:center;justify-content:center;font-size:36px;
                    font-weight:700;border:4px solid #dce7ff;
                }
                .profile-header h3 { font-weight:700;margin-bottom:5px; }
                .profile-header p { color:#e0e9ff;margin-bottom:4px; }
                .profile-id {
                    margin-left:auto;background:rgba(255,255,255,.13);
                    border:1px solid rgba(255,255,255,.25);
                    padding:13px 18px;border-radius:12px;min-width:150px;
                }
                .profile-id small { display:block;color:#dce7ff;margin-bottom:5px; }
                .profile-id strong { font-size:17px;overflow-wrap:anywhere; }
                .profile-section {
                    background:white;border:1px solid #e6ebf3;
                    border-radius:15px;padding:22px;margin-bottom:18px;
                    box-shadow:0 5px 20px rgba(25,40,70,.04);
                }
                .profile-section-title {
                    display:flex;align-items:center;gap:10px;color:#203d78;
                    font-weight:700;font-size:17px;padding-bottom:15px;
                    border-bottom:1px solid #edf0f5;margin-bottom:8px;
                }
                .profile-section-title i { font-size:21px; }
                .profile-detail {
                    padding:14px 5px;border-bottom:1px solid #edf0f5;min-height:72px;
                }
                .profile-detail small { display:block;color:#8791a4;margin-bottom:6px; }
                .profile-detail strong { color:#263754;overflow-wrap:anywhere;font-size:14px; }
                .profile-detail i { color:#315fbd;margin-right:6px; }
                @media(max-width:600px) {
                    .profile-header { padding:20px;gap:14px; }
                    .profile-avatar { width:65px;height:65px;min-width:65px;font-size:27px; }
                    .profile-header h3 { font-size:20px; }
                    .profile-id { margin-left:0;width:100%; }
                    .profile-section { padding:16px; }
                }
            </style>

            <div class="profile-wrap">
                <section class="profile-header">
                    <div class="profile-avatar">${esc(initial)}</div>
                    <div>
                        <p class="small mb-1">STUDENT PROFILE</p>
                        <h3>${esc(name)}</h3>
                        <p><i class="bi bi-mortarboard-fill me-1"></i>${esc(p.department || 'Department not assigned')}</p>
                    </div>
                    <div class="profile-id">
                        <small>STUDENT ID</small>
                        <strong>${esc(p.student_code || 'Not allotted')}</strong>
                    </div>
                </section>

                <section class="profile-section">
                    <div class="profile-section-title"><i class="bi bi-person-vcard"></i>Personal Information</div>
                    <div class="row">
                        ${[
                            ['Full Name','person',p.name],
                            ['Email Address','envelope',p.email],
                            ['Mobile Number','telephone',p.mobile],
                            ['Date of Birth','calendar',p.dob],
                            ['Gender','gender-ambiguous',p.gender]
                        ].map(x => `
                            <div class="col-md-6">
                                <div class="profile-detail">
                                    <small><i class="bi bi-${x[1]}"></i>${x[0]}</small>
                                    <strong>${esc(x[2] || 'Not provided')}</strong>
                                </div>
                            </div>`).join('')}
                    </div>
                </section>

                <section class="profile-section">
                    <div class="profile-section-title"><i class="bi bi-mortarboard"></i>Academic Information</div>
                    <div class="row">
                        ${[
                            ['Register Number','card-heading',p.register_no || 'Not allotted'],
                            ['Department','building',p.department || 'Not assigned'],
                            ['Course','book',p.course || 'Not allotted'],
                            ['Student Code','person-badge',p.student_code || 'Not allotted']
                        ].map(x => `
                            <div class="col-md-6">
                                <div class="profile-detail">
                                    <small><i class="bi bi-${x[1]}"></i>${x[0]}</small>
                                    <strong>${esc(x[2])}</strong>
                                </div>
                            </div>`).join('')}
                    </div>
                </section>
            </div>`;
    },


    /* APPLICATION */

    async Application() {
        const a = await api('/api/student/application');
        const courses = await api('/api/student/courses');

        const progress = String(a.status || '').toLowerCase().includes('approv') ? 100 :
            String(a.status || '').toLowerCase().includes('submit') ? 70 : 35;

        stPage('Admission Application','Manage your course preference and admission application.','bi-file-earmark-text',`
            <div class="row g-3 mb-3">
                ${stStat('Application Number',a.app_no || 'Not generated','bi-hash')}
                ${stStat('Application Status',a.status || 'Not submitted','bi-clipboard-check')}
                ${stStat('Selected Course',a.course || 'Not selected','bi-mortarboard')}
                ${stStat('Merit Percentage',a.percentage == null ? '—' : a.percentage + '%','bi-graph-up')}
            </div>

            ${stPanel('Application Progress',`
                <div class="d-flex justify-content-between mb-2">
                    <strong>Current progress</strong>${badge(a.status)}
                </div>
                <div class="st-progress"><div style="width:${progress}%"></div></div>
                <div class="d-flex justify-content-between small text-muted mt-2">
                    <span>Application started</span><span>Submission / Review</span><span>Admission</span>
                </div>
            `,'bi-bar-chart')}

            ${stPanel('Course Preference',`
                <div class="st-form">
                    <label>Select your preferred course</label>
                    <select id="crs" class="form-select mb-3">
                        ${courses.map(c => `
                            <option value="${c.id}" ${c.id == a.course_id ? 'selected' : ''}>
                                ${esc(c.name)} - ${esc(c.fee)}
                            </option>`).join('')}
                    </select>
                    <div class="d-flex flex-wrap gap-2">
                        <button class="btn st-primary" onclick="saveCourse()"><i class="bi bi-save me-1"></i>Save Course</button>
                        <button class="btn btn-success" onclick="submitAdmission()"><i class="bi bi-send me-1"></i>Submit Application</button>
                    </div>
                </div>
            `,'bi-mortarboard')}
        `);
    },


    /* ACADEMIC DETAILS */

    async 'Academic Details'() {
        const a = await api('/api/student/application');
        const d = a.details || {};

        const section = (label,key) => `
            <div class="col-lg-6">
                <div class="st-item">
                    <h6><i class="bi bi-book-half me-2"></i>${label}</h6>
                    <div class="st-form">
                        ${stField('Board / School',key+'b',d[key]?.board || '')}
                        ${stField('Passing Year',key+'y',d[key]?.year || '','number')}
                        <div class="table-responsive">
                            <table class="table table-sm align-middle">
                                <thead><tr><th>Subject</th><th>Marks</th><th>Maximum</th></tr></thead>
                                <tbody>
                                    ${[0,1,2].map(i => `
                                        <tr>
                                            <td><input id="${key}s${i}" class="form-control form-control-sm" placeholder="Subject" value="${esc(d[key]?.subjects?.[i]?.name || '')}"></td>
                                            <td><input id="${key}m${i}" type="number" class="form-control form-control-sm" placeholder="Marks" value="${esc(d[key]?.subjects?.[i]?.marks ?? '')}"></td>
                                            <td><input id="${key}x${i}" type="number" class="form-control form-control-sm" placeholder="Max" value="${esc(d[key]?.subjects?.[i]?.max ?? 100)}"></td>
                                        </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>`;

        stPage('Academic Details','Add and maintain your previous academic information.','bi-journal-bookmark',`
            ${stPanel('Personal Academic Details',`
                <div class="row st-form">
                    <div class="col-md-6">${stField('Parent / Guardian Name','guard',d.guardian || '')}</div>
                    <div class="col-md-6">
                        <label>Permanent Address</label>
                        <textarea id="addr" class="form-control" rows="2" placeholder="Enter permanent address">${esc(d.address || '')}</textarea>
                    </div>
                </div>
            `,'bi-person-lines-fill')}

            <div class="row">
                ${section('10th Standard','tenth')}
                ${section('12th Standard','twelfth')}
            </div>

            ${stPanel('Academic Summary',`
                <div class="st-row"><span>Calculated Percentage</span><strong>${esc(a.percentage ?? 'Not calculated')}%</strong></div>
                <button class="btn st-primary mt-3" onclick="saveAcad()"><i class="bi bi-save me-1"></i>Save Academic Details</button>
            `,'bi-calculator')}
        `);
    },


    /* DOCUMENTS */

    async Documents() {
        const a = await api('/api/student/application');
        const kinds = [
            '10th Marksheet','12th Marksheet','Transfer Certificate',
            'Community Certificate','Photograph','Government ID'
        ];

        const uploaded = a.documents || [];

        stPage('Document Centre','Upload and track the verification status of your admission documents.','bi-cloud-arrow-up',`
            <div class="row g-3 mb-3">
                ${stStat('Required Documents',kinds.length,'bi-folder')}
                ${stStat('Uploaded',uploaded.length,'bi-cloud-check')}
                ${stStat('Approved',uploaded.filter(d => String(d.status).toLowerCase().includes('approv')).length,'bi-check-circle')}
                ${stStat('Pending',uploaded.filter(d => String(d.status).toLowerCase().includes('pending')).length,'bi-hourglass')}
            </div>

            <div class="row">
                ${kinds.map((kind,i) => {
                    const doc = uploaded.find(d => d.kind === kind);
                    const id = 'f' + kind.replace(/\W/g,'');
                    return `<div class="col-md-6 col-xl-4">
                        <div class="st-item h-100">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div class="st-icon"><i class="bi bi-file-earmark-pdf"></i></div>
                                ${doc ? badge(doc.status) : badge('Not uploaded')}
                            </div>
                            <h6>${esc(kind)}</h6>
                            <p class="small text-muted">${doc ? 'Document submitted for verification.' : 'Upload the required document.'}</p>
                            ${doc?.reason ? `<p class="small text-danger">${esc(doc.reason)}</p>` : ''}
                            <div class="st-form">
                                <input type="file" id="${id}" class="form-control form-control-sm mb-2">
                                <button class="btn st-primary w-100" onclick="up('${kind}')">
                                    <i class="bi bi-upload me-1"></i>${doc ? 'Replace / Upload' : 'Upload Document'}
                                </button>
                            </div>
                            ${doc ? `<a class="small d-inline-block mt-2" href="/api/student/documents/${encodeURIComponent(kind)}" target="_blank"><i class="bi bi-eye me-1"></i>View submitted document</a>` : ''}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `);
    },


    /* ADMISSION FEE */

    async 'Admission Fee'() {
        const a = await api('/api/student/application');
        const payments = a.payments || [];
        const total = payments.reduce((sum,p) => sum + (Number(p.amount) || 0),0);

        stPage('Admission Fee','View your application fee payment information.','bi-credit-card',`
            <div class="row g-3 mb-3">
                ${stStat('Payment Records',payments.length,'bi-receipt')}
                ${stStat('Recorded Amount',total.toLocaleString('en-IN'),'bi-currency-rupee')}
                ${stStat('Application Number',a.app_no || '—','bi-hash')}
                ${stStat('Application Status',a.status || '—','bi-clipboard-check')}
            </div>

            ${stPanel('Application Fee Payment',`
                <div class="alert alert-primary">
                    <i class="bi bi-info-circle me-2"></i>
                    Demo payment only. No real money will be charged.
                </div>
                <button class="btn st-primary" onclick="payAdmission()">
                    <i class="bi bi-wallet2 me-1"></i>Pay Application Fee
                </button>
            `,'bi-wallet2')}

            ${stPanel('Payment History',tbl(
                ['Reference','Amount','Mode','Status','Date'],
                payments.map(p => [
                    esc(p.ref),esc(p.amount),esc(p.mode),badge(p.status),esc(p.date?.slice(0,10))
                ])
            ),'bi-clock-history')}
        `);
    },


    /* ATTENDANCE */

    async Attendance() {
        const d = await api('/api/student/attendance');
        const summary = d.summary || [];
        const records = d.records || [];
        const total = summary.reduce((n,s) => n + (Number(s.total_classes) || 0),0);
        const attended = summary.reduce((n,s) => n + (Number(s.attended) || 0),0);
        const percentage = total ? Math.round(attended / total * 100) : 0;

        stPage('Attendance Overview','Monitor your class attendance and subject-wise attendance records.','bi-calendar2-check',`
            <div class="row g-3 mb-3">
                ${stStat('Overall Attendance',percentage + '%','bi-percent')}
                ${stStat('Total Classes',total,'bi-calendar3')}
                ${stStat('Classes Attended',attended,'bi-check-circle')}
                ${stStat('Classes Absent',Math.max(total-attended,0),'bi-x-circle')}
            </div>

            ${stPanel('Overall Attendance Progress',`
                <div class="d-flex justify-content-between mb-2">
                    <strong>Attendance percentage</strong><strong>${percentage}%</strong>
                </div>
                <div class="st-progress"><div style="width:${Math.min(100,percentage)}%"></div></div>
                <p class="small text-muted mt-2 mb-0">Attendance is calculated from the records available in your portal.</p>
            `,'bi-graph-up')}

            ${stPanel('Subject-wise Attendance',`
                <div class="row g-3">
                    ${summary.map(s => `
                        <div class="col-md-6">
                            <div class="st-item mb-0">
                                <div class="d-flex justify-content-between gap-2">
                                    <strong>${esc(s.subject)}</strong>${badge((s.percentage ?? 0) + '%')}
                                </div>
                                <small class="text-muted">${esc(s.subject_code)}</small>
                                <div class="st-progress my-3"><div style="width:${Math.min(100,Number(s.percentage)||0)}%"></div></div>
                                <div class="d-flex justify-content-between small text-muted">
                                    <span>Attended: ${esc(s.attended)}</span>
                                    <span>Total: ${esc(s.total_classes)}</span>
                                </div>
                            </div>
                        </div>`).join('') || stEmpty('No subject attendance records available.')}
                </div>
            `,'bi-book')}

            ${stPanel('Attendance History',tbl(
                ['Subject','Date','Period','Status','Remarks'],
                records.map(r => [
                    esc(r.subject),esc(r.date),esc(r.period),badge(r.status),esc(r.remarks)
                ])
            ),'bi-clock-history')}
        `);
    },


    /* INTERNAL MARKS */

    async 'Internal Marks'() {
        const rows = await api('/api/student/internal-marks');

        const total = rows.reduce((n,r) => n + (Number(r.marks)||0),0);
        const max = rows.reduce((n,r) => n + (Number(r.maximum)||0),0);
        const avg = max ? Math.round(total / max * 100) : 0;

        stPage('Internal Assessment','Review your internal assessment marks and subject performance.','bi-clipboard-data',`
            <div class="row g-3 mb-3">
                ${stStat('Assessments',rows.length,'bi-journal-check')}
                ${stStat('Marks Obtained',total,'bi-award')}
                ${stStat('Maximum Marks',max,'bi-bullseye')}
                ${stStat('Overall Percentage',avg + '%','bi-graph-up')}
            </div>

            ${stPanel('Assessment Records',`
                ${rows.length ? `<div class="table-responsive"><table class="table st-table table-hover align-middle">
                    <thead><tr><th>Subject</th><th>Assessment</th><th>Marks</th><th>Maximum</th><th>Remarks</th></tr></thead>
                    <tbody>${rows.map(r => `
                        <tr>
                            <td><strong>${esc(r.subject)}</strong><br><small class="text-muted">${esc(r.subject_code)}</small></td>
                            <td>${esc(r.assessment)}</td>
                            <td><strong>${esc(r.marks)}</strong></td>
                            <td>${esc(r.maximum)}</td>
                            <td>${esc(r.remarks)}</td>
                        </tr>`).join('')}</tbody>
                </table></div>` : stEmpty('No internal marks have been published.','bi-clipboard-data')}
            `,'bi-list-check')}
        `);
    },


    /* RESULTS */

    async Results() {
        const d = await api('/api/student/results');
        const results = d.results || [];

        stPage('Examination Results','View your published semester results and academic performance.','bi-award',`
            <div class="row g-3 mb-3">
                ${stStat('Current CGPA',d.cgpa ?? 'Not published','bi-trophy')}
                ${stStat('Subjects Published',results.length,'bi-book')}
                ${stStat('Semesters',new Set(results.map(r => r.semester)).size,'bi-calendar3')}
                ${stStat('Result Status',results.length ? 'Published' : 'Awaiting','bi-clipboard-check')}
            </div>

            ${stPanel('Academic Result Summary',`
                <div class="st-ticket mb-3">
                    <div class="row align-items-center">
                        <div class="col-7">
                            <small class="text-muted">CUMULATIVE GRADE POINT AVERAGE</small>
                            <h2 class="fw-bold text-primary mb-0">${esc(d.cgpa ?? '—')}</h2>
                        </div>
                        <div class="col-5 text-end"><i class="bi bi-mortarboard-fill display-3 text-primary"></i></div>
                    </div>
                </div>
                ${results.length ? tbl(
                    ['Semester','Subject','Internal','External','Total','Grade','Grade Points','Credits'],
                    results.map(r => [
                        esc(r.semester),esc(r.subject),esc(r.internal),esc(r.external),
                        esc(r.total),badge(r.grade),esc(r.grade_points),esc(r.credits)
                    ])
                ) : stEmpty('Your examination results have not been published yet.','bi-award')}
            `,'bi-bar-chart-line')}
        `);
    },


    /* EXAM TIMETABLE */

    async 'Exam Timetable'() {
        const rows = await api('/api/student/exam-timetable');

        stPage('Examination Timetable','Check your upcoming examination dates, timings and venues.','bi-calendar-event',`
            ${stPanel('Exam Schedule',`
                ${rows.length ? `<div class="table-responsive">
                    <table class="table st-table table-hover align-middle">
                        <thead><tr><th>Exam</th><th>Subject</th><th>Date</th><th>Time</th><th>Venue</th></tr></thead>
                        <tbody>${rows.map(r => `
                            <tr>
                                <td>${badge(r.exam_type)}</td>
                                <td><strong>${esc(r.subject)}</strong><br><small>${esc(r.subject_code)}</small></td>
                                <td><i class="bi bi-calendar3 me-1 text-primary"></i>${esc(r.date)}</td>
                                <td>${esc(r.start_time)} - ${esc(r.end_time)}</td>
                                <td>${esc(r.room)}</td>
                            </tr>`).join('')}</tbody>
                    </table></div>` : stEmpty('No examination timetable has been published.','bi-calendar-event')}
            `,'bi-clock')}
            ${rows.length ? stPanel('Exam Instructions',`
                ${rows.map(r => `<div class="st-item">
                    <strong>${esc(r.subject)}</strong>
                    <p class="mb-0 small text-muted">${esc(r.instructions || 'No additional instructions')}</p>
                </div>`).join('')}
            `,'bi-info-circle') : ''}
        `);
    },


    /* HALL TICKETS */

    async 'Hall Tickets'() {
        const rows = await api('/api/student/hall-tickets');

        stPage('Hall Tickets','View your examination hall ticket eligibility and issue details.','bi-ticket-perforated',`
            ${rows.length ? `<div class="row g-3">
                ${rows.map(r => `
                    <div class="col-lg-6">
                        <div class="st-ticket h-100">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <span class="small fw-bold text-primary">EXAMINATION HALL TICKET</span>
                                <i class="bi bi-patch-check-fill fs-4 text-primary"></i>
                            </div>
                            <h5 class="fw-bold">${esc(r.number)}</h5>
                            <div class="st-row"><span>Semester</span><strong>${esc(r.semester)}</strong></div>
                            <div class="st-row"><span>Examination</span><strong>${esc(r.exam_type)}</strong></div>
                            <div class="st-row"><span>Eligibility</span><strong>${badge(r.eligible ? 'Eligible' : 'Not Eligible')}</strong></div>
                            <div class="st-row"><span>Issued Date</span><strong>${esc(r.issued_at?.slice(0,10) || 'Not issued')}</strong></div>
                            <div class="mt-3 small text-muted"><i class="bi bi-info-circle me-1"></i>Keep your hall ticket available during examination.</div>
                        </div>
                    </div>`).join('')}
            </div>` : stEmpty('No hall tickets have been issued yet.','bi-ticket-perforated')}
        `);
    },


    /* FEES */

    async Fees() {
        const rows = await api('/api/student/fees');

        const total = rows.reduce((n,f) => n + (Number(f.amount)||0),0);
        const paid = rows.filter(f => String(f.status).toLowerCase() === 'paid')
            .reduce((n,f) => n + (Number(f.amount)||0),0);
        const pending = total - paid;

        stPage('Fee Management','View your fee details, payment status and outstanding balance.','bi-wallet2',`
            <div class="row g-3 mb-3">
                ${stStat('Total Fees',total.toLocaleString('en-IN'),'bi-currency-rupee')}
                ${stStat('Paid Amount',paid.toLocaleString('en-IN'),'bi-check-circle')}
                ${stStat('Pending Amount',pending.toLocaleString('en-IN'),'bi-hourglass')}
                ${stStat('Fee Records',rows.length,'bi-receipt')}
            </div>

            ${stPanel('Fee Payment Overview',`
                <div class="d-flex justify-content-between mb-2">
                    <strong>Payment completion</strong>
                    <strong>${total ? Math.round(paid/total*100) : 0}%</strong>
                </div>
                <div class="st-progress"><div style="width:${total ? Math.min(100,paid/total*100) : 0}%"></div></div>
                <p class="small text-muted mt-2 mb-0">This summary is based on the fee records returned by the portal.</p>
            `,'bi-graph-up')}

            ${stPanel('Fee Details',`
                ${rows.length ? `<div class="table-responsive">
                    <table class="table st-table table-hover align-middle">
                        <thead><tr><th>Fee Type</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
                        <tbody>${rows.map(f => `
                            <tr>
                                <td><strong>${esc(f.type)}</strong><br><small class="text-muted">${esc(f.reference || '')}</small></td>
                                <td>₹${esc(f.amount)}</td>
                                <td>${esc(f.due_date)}</td>
                                <td>${badge(f.status)}</td>
                                <td>${f.status === 'Pending'
                                    ? `<button class="btn btn-sm st-primary" onclick="payFee(${f.id})">Pay Demo Fee</button>`
                                    : badge('Paid')}</td>
                            </tr>`).join('')}</tbody>
                    </table></div>` : stEmpty('No fee records are available.','bi-wallet2')}
                <div class="alert alert-warning small mb-0 mt-3">
                    <i class="bi bi-info-circle me-1"></i>Demo payment only. No real money is charged.
                </div>
            `,'bi-receipt')}
        `);
    },


    /* LEAVE APPLICATION */

    async 'Leave Application'() {
        const rows = await api('/api/student/leaves');

        stPage('Leave Application','Submit a leave request and track the review status.','bi-calendar-minus',`
            <div class="row g-3">
                <div class="col-lg-5">
                    ${stPanel('New Leave Request',`
                        <div class="st-form">
                            <div class="mb-3"><label>From Date</label><input type="date" id="lf" class="form-control"></div>
                            <div class="mb-3"><label>To Date</label><input type="date" id="lt" class="form-control"></div>
                            <div class="mb-3"><label>Reason for Leave</label><textarea id="lr" rows="4" class="form-control" placeholder="Enter your reason"></textarea></div>
                            <button class="btn st-primary w-100" onclick="applyLeave()"><i class="bi bi-send me-1"></i>Submit Leave Request</button>
                        </div>
                    `,'bi-pencil-square')}
                </div>
                <div class="col-lg-7">
                    ${stPanel('My Leave Requests',`
                        ${rows.length ? rows.map(r => `
                            <div class="st-item">
                                <div class="d-flex justify-content-between gap-2">
                                    <strong>${esc(r.from_date)} to ${esc(r.to_date)}</strong>${badge(r.status)}
                                </div>
                                <p class="small text-muted mt-2 mb-1">${esc(r.reason)}</p>
                                ${r.reviewer_note ? `<div class="small"><strong>Reviewer note:</strong> ${esc(r.reviewer_note)}</div>` : ''}
                            </div>`).join('') : stEmpty('You have not submitted any leave requests.','bi-calendar-minus')}
                    `,'bi-clock-history')}
                </div>
            </div>
        `);
    },


    /* SCHOLARSHIPS */

    async Scholarships() {
        const rows = await api('/api/student/scholarships');

        stPage('Scholarships','Explore available scholarships and submit your applications.','bi-award',`
            <div class="row g-3 mb-3">
                ${stStat('Available Scholarships',rows.length,'bi-award')}
                ${stStat('Applied',rows.filter(s => s.application_status).length,'bi-send-check')}
                ${stStat('Not Applied',rows.filter(s => !s.application_status).length,'bi-hourglass')}
                ${stStat('Application Centre','Open','bi-mortarboard')}
            </div>

            <div class="row">
                ${rows.length ? rows.map(s => `
                    <div class="col-md-6 col-xl-4">
                        <div class="st-item h-100">
                            <div class="d-flex justify-content-between mb-3">
                                <div class="st-icon"><i class="bi bi-award"></i></div>
                                ${badge(s.application_status || 'Not Applied')}
                            </div>
                            <h5>${esc(s.title)}</h5>
                            <p class="text-muted small">${esc(s.description)}</p>
                            <div class="st-row"><span>Scholarship Amount</span><strong>${esc(s.amount)}</strong></div>
                            <div class="mt-3">
                                <small class="st-label">ELIGIBILITY</small>
                                <p class="small">${esc(s.eligibility)}</p>
                            </div>
                            ${!s.application_status ? `
                                <div class="st-form mt-3">
                                    <label>Application Reason</label>
                                    <textarea id="sr${s.id}" class="form-control mb-2" rows="2" placeholder="Why are you applying?"></textarea>
                                    <button class="btn st-primary w-100" onclick="applyScholarship(${s.id})">Apply Now</button>
                                </div>` : ''}
                        </div>
                    </div>`).join('') : stEmpty('No scholarships are currently available.','bi-award')}
            </div>
        `);
    },


    /* CERTIFICATE REQUESTS */

    async 'Certificate Requests'() {
        const rows = await api('/api/student/certificates');

        stPage('Certificate Services','Request academic certificates and follow their processing status.','bi-file-earmark-medical',`
            <div class="row g-3">
                <div class="col-lg-5">
                    ${stPanel('New Certificate Request',`
                        <div class="st-form">
                            <label>Certificate Type</label>
                            <select id="ct" class="form-select mb-3">
                                <option>Bonafide Certificate</option>
                                <option>Transfer Certificate</option>
                                <option>Course Completion Certificate</option>
                                <option>Character Certificate</option>
                                <option>Fee Certificate</option>
                            </select>
                            <label>Purpose</label>
                            <textarea id="cp" class="form-control mb-3" rows="4" placeholder="Explain why you need this certificate"></textarea>
                            <button class="btn st-primary w-100" onclick="requestCertificate()"><i class="bi bi-send me-1"></i>Submit Request</button>
                        </div>
                    `,'bi-pencil-square')}
                </div>
                <div class="col-lg-7">
                    ${stPanel('Request History',`
                        ${rows.length ? rows.map(r => `
                            <div class="st-item">
                                <div class="d-flex justify-content-between align-items-center gap-2">
                                    <strong>${esc(r.type)}</strong>${badge(r.status)}
                                </div>
                                <p class="small text-muted mt-2 mb-1">${esc(r.purpose)}</p>
                                ${r.admin_note ? `<small><strong>Admin Note:</strong> ${esc(r.admin_note)}</small>` : ''}
                            </div>`).join('') : stEmpty('No certificate requests submitted.','bi-file-earmark')}
                    `,'bi-clock-history')}
                </div>
            </div>
        `);
    },


    /* GRIEVANCES */

    async Grievances() {
        const rows = await api('/api/student/grievances');

        stPage('Student Grievance Centre','Submit a concern and track the response from the administration.','bi-chat-square-text',`
            <div class="row g-3">
                <div class="col-lg-5">
                    ${stPanel('Submit a Grievance',`
                        <div class="st-form">
                            <label>Grievance Category</label>
                            <select id="gc" class="form-select mb-3">
                                <option>Academic</option>
                                <option>Examination</option>
                                <option>Fees</option>
                                <option>Faculty</option>
                                <option>Infrastructure</option>
                                <option>Other</option>
                            </select>
                            <label>Subject</label>
                            <input id="gs" class="form-control mb-3" placeholder="Short subject">
                            <label>Description</label>
                            <textarea id="gd" rows="5" class="form-control mb-3" placeholder="Describe your concern clearly"></textarea>
                            <button class="btn st-primary w-100" onclick="submitGrievance()"><i class="bi bi-send me-1"></i>Submit Grievance</button>
                        </div>
                    `,'bi-pencil-square')}
                </div>
                <div class="col-lg-7">
                    ${stPanel('Grievance History',`
                        ${rows.length ? rows.map(r => `
                            <div class="st-item">
                                <div class="d-flex justify-content-between gap-2">
                                    <strong>${esc(r.subject)}</strong>${badge(r.status)}
                                </div>
                                <small class="text-primary">${esc(r.category)}</small>
                                <p class="small text-muted mt-2">${esc(r.description)}</p>
                                ${r.response ? `<div class="alert alert-light small mb-0"><strong>Response:</strong> ${esc(r.response)}</div>` : ''}
                            </div>`).join('') : stEmpty('No grievances have been submitted.','bi-chat-square-text')}
                    `,'bi-clock-history')}
                </div>
            </div>
        `);
    },


    /* LIBRARY */

    async Library() {
        const [books, loans] = await Promise.all([
            api('/api/student/library/books'),
            api('/api/student/library/loans')
        ]);

        stPage('Library Services','Explore the available library catalogue and review your book loans.','bi-book-half',`
            <div class="row g-3 mb-3">
                ${stStat('Books Listed',books.length,'bi-book')}
                ${stStat('My Loans',loans.length,'bi-journal-bookmark')}
                ${stStat('Available Copies',books.reduce((n,b) => n + (Number(b.available_copies)||0),0),'bi-bookmark-check')}
                ${stStat('Library Status','Active','bi-building')}
            </div>

            ${stPanel('Library Catalogue',`
                ${books.length ? `<div class="row g-3">
                    ${books.map(b => `
                        <div class="col-md-6 col-xl-4">
                            <div class="st-item h-100">
                                <div class="st-icon mb-3"><i class="bi bi-book"></i></div>
                                <h6>${esc(b.title)}</h6>
                                <p class="small text-muted mb-2">By ${esc(b.author)}</p>
                                <div class="st-row"><span>Accession No.</span><strong>${esc(b.accession_number)}</strong></div>
                                <div class="st-row"><span>Category</span><strong>${esc(b.category)}</strong></div>
                                <div class="st-row"><span>Available Copies</span><strong>${esc(b.available_copies)}</strong></div>
                            </div>
                        </div>`).join('')}
                </div>` : stEmpty('No library books are listed.','bi-book')}
            `,'bi-collection')}

            ${stPanel('My Book Loans',tbl(
                ['Book','Issue Date','Due Date','Return Date','Status'],
                loans.map(l => [
                    esc(l.book),esc(l.issue_date),esc(l.due_date),
                    esc(l.return_date),badge(l.status)
                ])
            ),'bi-journal-check')}
        `);
    },


    /* NOTIFICATIONS */

    async Notifications() {
        const rows = await api('/api/student/notifications');

        stPage('Notifications','Stay informed about admission updates and important college announcements.','bi-bell',`
            ${stPanel('Recent Notifications',`
                ${rows.length ? `<div class="st-timeline">
                    ${rows.map(n => `
                        <div class="st-timeline-item">
                            <div class="d-flex justify-content-between gap-2 flex-wrap">
                                <strong><i class="bi bi-bell-fill text-primary me-2"></i>Portal Notification</strong>
                                <small class="text-muted">${esc(n.at?.slice(0,16))}</small>
                            </div>
                            <p class="mb-0 mt-2">${esc(n.m)}</p>
                        </div>`).join('')}
                </div>` : stEmpty('You are all caught up. No notifications available.','bi-bell-slash')}
            `,'bi-inbox')}
        `);
    },


    /* STATUS - EXISTING PAGE */

    async Status() {
        const a = await api('/api/student/application');

        stPage('Application Status','Track the progress of your admission application.','bi-clipboard-check',`
            ${stPanel('Current Application Status',`
                <h4>${badge(a.status)}</h4>
                <p class="text-muted small">Application Number: ${esc(a.app_no)}</p>
            `,'bi-info-circle')}
            ${stPanel('Status History',`
                ${(a.history || []).length ? `<div class="st-timeline">
                    ${a.history.map(h => `
                        <div class="st-timeline-item">
                            <strong>${badge(h.status)}</strong>
                            <p class="small mt-2 mb-1">${esc(h.note)}</p>
                            <small class="text-muted">${esc(h.at?.slice(0,16))}</small>
                        </div>`).join('')}
                </div>` : stEmpty('No application history available.')}
            `,'bi-clock-history')}
        `);
    },


    /* MERIT & SEAT */

    async 'Merit & Seat'() {
        const [a,s] = await Promise.all([
            api('/api/student/application'),
            api('/api/student/allocation')
        ]);

        stPage('Merit & Seat Allocation','Review your merit details and admission seat allocation status.','bi-trophy',`
            <div class="row g-3 mb-3">
                ${stStat('Merit Rank',a.rank ?? 'Not published','bi-award')}
                ${stStat('Merit Score',a.merit_score ?? '—','bi-graph-up')}
                ${stStat('Application Status',a.status || '—','bi-clipboard-check')}
                ${stStat('Seat Status',s?.status || 'Awaiting','bi-mortarboard')}
            </div>

            ${stPanel('Merit Information',`
                <div class="st-ticket">
                    <div class="row">
                        <div class="col-7">
                            <small class="text-muted">YOUR MERIT RANK</small>
                            <h2 class="fw-bold text-primary">${esc(a.rank ?? '—')}</h2>
                        </div>
                        <div class="col-5 text-end">
                            <i class="bi bi-trophy-fill display-3 text-primary"></i>
                        </div>
                    </div>
                    <div class="st-row"><span>Merit Score</span><strong>${esc(a.merit_score ?? 'Not published')}</strong></div>
                    <div class="st-row"><span>Application Number</span><strong>${esc(a.app_no || '—')}</strong></div>
                </div>
            `,'bi-bar-chart')}

            ${stPanel('Seat Allocation Details',`
                ${s ? `
                    <div class="st-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Seat Allocation</h5>${badge(s.status)}
                        </div>
                        <div class="st-row"><span>Allocated Course</span><strong>${esc(s.course)}</strong></div>
                        <div class="st-row"><span>Register Number</span><strong>${esc(s.register_no || 'Not allotted')}</strong></div>
                        ${s.status === 'Offered' ? `
                            <div class="alert alert-primary mt-3">A seat has been offered. Please submit your response.</div>
                            <button class="btn btn-success me-2" onclick="respondSeat('accept')"><i class="bi bi-check-circle me-1"></i>Accept Seat</button>
                            <button class="btn btn-danger" onclick="respondSeat('decline')"><i class="bi bi-x-circle me-1"></i>Decline Seat</button>
                        ` : ''}
                    </div>
                ` : stEmpty('No seat has been allocated yet.','bi-mortarboard')}
            `,'bi-building')}
        `);
    }

},


/* =====================================================
   FACULTY PORTAL - EXISTING FUNCTIONALITY
===================================================== */

faculty: {
    async 'Assigned Applications'() {
        const rows = await api('/api/faculty/applications');

        $('main').innerHTML = tbl(
            ['Application No','Name','Course','Percentage','Status','Action'],
            rows.map(a => [
                esc(a.app_no),esc(a.name),esc(a.course),
                esc(a.percentage),badge(a.status),
                `<button class="btn btn-sm btn-primary" onclick="reviewApplication(${a.id})">Review</button>`
            ])
        );
    }
},


/* =====================================================
   ADMIN PORTAL - EXISTING FUNCTIONALITY
===================================================== */

admin: {

    async Dashboard() {
        const s = await api('/api/admin/stats');

        $('main').innerHTML =
            `<div class="row">` +
            Object.entries(s).filter(([k]) => k !== 'by_course').map(([k,v]) => `
                <div class="col-md-3 col-6">
                    <div class="card p-3 mb-3">
                        <small class="text-muted">${esc(k.replaceAll('_',' '))}</small>
                        <h3>${esc(v)}</h3>
                    </div>
                </div>`).join('') +
            `</div>` +
            tbl(['Course','Applications'],
                s.by_course.map(x => [esc(x.course),esc(x.count)]));
    },

    async Courses() {
        $('main').innerHTML = card(`
            <h5>Add Course</h5>
            <input id="cn" class="form-control mb-2" placeholder="Course name">
            <input id="cd" class="form-control mb-2" placeholder="Department">
            <input id="ci" type="number" class="form-control mb-2" placeholder="Intake">
            <input id="cm" type="number" class="form-control mb-2" placeholder="Minimum percentage">
            <input id="cfee" type="number" class="form-control mb-2" placeholder="Course fee">
            <button class="btn btn-primary" onclick="addCourse()">Add Course</button>
        `);
    },

    async Applications() {
        const [rows,faculty] = await Promise.all([
            api('/api/admin/applications'),
            api('/api/admin/faculty')
        ]);

        const options = faculty.filter(f => f.approved)
            .map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('');

        $('main').innerHTML = tbl(
            ['Application','Student','Course','Status','Recommendation','Rank','Actions'],
            rows.map(a => [
                esc(a.app_no),esc(a.name),esc(a.course),
                badge(a.status),esc(a.recommendation),esc(a.rank),
                `<select id="fs${a.id}" class="form-select form-select-sm mb-1">${options}</select>
                 <button class="btn btn-sm btn-primary" onclick="assignFaculty(${a.id})">Assign</button>
                 <button class="btn btn-sm btn-success" onclick="confirmAdmission(${a.id})">Confirm</button>`
            ])
        );
    },

    async Faculty() {
        const rows = await api('/api/admin/faculty');

        $('main').innerHTML = tbl(
            ['Name','Department','Approved','Action'],
            rows.map(f => [
                esc(f.name),esc(f.dept),
                badge(f.approved ? 'Approved' : 'Pending'),
                f.approved ? '' :
                    `<button class="btn btn-sm btn-primary" onclick="approveFaculty(${f.id})">Approve</button>`
            ])
        );
    },

    async 'Merit & Seats'() {
        $('main').innerHTML = card(`
            <h5>Merit and Seat Allocation</h5>
            <button class="btn btn-primary me-2 mb-2" onclick="adminAction('merit/calculate')">1. Calculate Merit</button>
            <button class="btn btn-warning me-2 mb-2" onclick="adminAction('merit/publish')">2. Publish Merit</button>
            <button class="btn btn-success mb-2" onclick="adminAction('allocate')">3. Allocate Seats</button>
        `);
    },

    async Announce() {
        $('main').innerHTML = card(`
            <h5>Send Announcement</h5>
            <textarea id="an" class="form-control mb-2" placeholder="Enter announcement"></textarea>
            <button class="btn btn-primary" onclick="sendAnnouncement()">Send Announcement</button>
        `);
    }
}

};


/* =====================================================
   STUDENT QUICK ACTION NAVIGATION
===================================================== */

function openStudentPage(page) {
    const button = Array.from(document.querySelectorAll('#nav .btn'))
        .find(item => item.textContent.trim().endsWith(page));

    if (button) go(page,button);
    else alert('This page is not available in your menu.');
}


/* =====================================================
   STUDENT ACTIONS - EXISTING API OPERATIONS
===================================================== */

async function saveCourse() {
    await api('/api/student/application','PUT',{
        course_id:Number($('crs').value)
    });
    alert('Course saved');
    go('Application');
}

async function submitAdmission() {
    await api('/api/student/submit','POST');
    alert('Application submitted');
    go('Application');
}

async function saveAcad() {
    const group = key => ({
        board:$(key+'b').value,
        year:$(key+'y').value,
        subjects:[0,1,2]
            .filter(i => $(key+'m'+i).value !== '')
            .map(i => ({
                name:$(key+'s'+i).value,
                marks:Number($(key+'m'+i).value),
                max:Number($(key+'x'+i).value)
            }))
    });

    await api('/api/student/application','PUT',{
        details:{
            tenth:group('tenth'),
            twelfth:group('twelfth'),
            guardian:$('guard').value,
            address:$('addr').value
        }
    });

    alert('Academic details saved');
    go('Academic Details');
}

async function up(kind) {
    const file = $('f'+kind.replace(/\W/g,'')).files[0];
    if (!file) return alert('Please choose a file');

    const form = new FormData();
    form.append('kind',kind);
    form.append('file',file);

    await api('/api/student/documents','POST',null,form);
    alert('Document uploaded');
    go('Documents');
}

async function payAdmission() {
    await api('/api/student/payment','POST');
    alert('Demo payment recorded');
    go('Admission Fee');
}

async function payFee(id) {
    const result = await api(`/api/student/fees/${id}/pay`,'POST');
    alert(result.message + '\nReference: ' + result.reference);
    go('Fees');
}

async function applyLeave() {
    await api('/api/student/leaves','POST',{
        from_date:$('lf').value,
        to_date:$('lt').value,
        reason:$('lr').value
    });

    alert('Leave application submitted');
    go('Leave Application');
}

async function applyScholarship(id) {
    await api(`/api/student/scholarships/${id}/apply`,'POST',{
        reason:$('sr'+id).value
    });

    alert('Scholarship application submitted');
    go('Scholarships');
}

async function requestCertificate() {
    await api('/api/student/certificates','POST',{
        certificate_type:$('ct').value,
        purpose:$('cp').value
    });

    alert('Certificate request submitted');
    go('Certificate Requests');
}

async function submitGrievance() {
    await api('/api/student/grievances','POST',{
        category:$('gc').value,
        subject:$('gs').value,
        description:$('gd').value
    });

    alert('Grievance submitted');
    go('Grievances');
}

async function respondSeat(action) {
    await api('/api/student/allocation/' + action,'POST');
    alert('Your response has been recorded');
    go('Merit & Seat');
}


/* =====================================================
   FACULTY / ADMIN ACTIONS - EXISTING
===================================================== */

a
async function reviewApplication(id) {
    ensureFacultyStyles();

    const d = await api('/api/faculty/applications/' + id);
    const minimum = Number(d.course?.min_percentage ?? 0);
    const percentage = Number(d.percentage ?? 0);
    const eligible = d.percentage !== null &&
        d.percentage !== undefined &&
        d.course &&
        percentage >= minimum;

    const details = facultyDetailRows(d.details || {});
    const documents = d.documents || [];

    $('main').innerHTML = `
        <div class="faculty-page">
            <div class="faculty-topbar">
                <div>
                    <div class="faculty-eyebrow">FACULTY WORKSPACE</div>
                    <h2>Application Review</h2>
                    <p>Review applicant information and verify submitted documents.</p>
                </div>
                <button class="btn faculty-back-btn" onclick="go('Assigned Applications')">
                    <i class="bi bi-arrow-left me-2"></i>Back to Applications
                </button>
            </div>

            <div class="faculty-review-hero">
                <div class="faculty-avatar">
                    <i class="bi bi-person-fill"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="faculty-eyebrow">APPLICANT</div>
                    <h3>${esc(d.name)}</h3>
                    <span class="faculty-app-number">${esc(d.app_no)}</span>
                </div>
                <div class="faculty-eligibility ${eligible ? 'eligible' : 'ineligible'}">
                    <i class="bi ${eligible ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i>
                    ${eligible ? 'Eligible' : 'Not Eligible'}
                </div>
            </div>

            <div class="row g-3 faculty-metrics">
                <div class="col-md-4">
                    <div class="faculty-metric">
                        <span>Academic Percentage</span>
                        <strong>${d.percentage ?? 'N/A'}${d.percentage != null ? '%' : ''}</strong>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="faculty-metric">
                        <span>Minimum Requirement</span>
                        <strong>${d.course?.min_percentage ?? 'N/A'}${d.course?.min_percentage != null ? '%' : ''}</strong>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="faculty-metric">
                        <span>Course Applied</span>
                        <strong>${esc(d.course?.name || 'Not available')}</strong>
                    </div>
                </div>
            </div>

            <div class="faculty-section">
                <div class="faculty-section-heading">
                    <div class="faculty-section-icon">
                        <i class="bi bi-person-vcard"></i>
                    </div>
                    <div>
                        <h5>Applicant Information</h5>
                        <p>Submitted academic and personal details</p>
                    </div>
                </div>

                ${details || `
                    <div class="faculty-empty">
                        <i class="bi bi-info-circle"></i>
                        No additional applicant details available.
                    </div>
                `}
            </div>

            <div class="faculty-section">
                <div class="faculty-section-heading">
                    <div class="faculty-section-icon">
                        <i class="bi bi-file-earmark-check"></i>
                    </div>
                    <div>
                        <h5>Document Verification</h5>
                        <p>Review and verify each uploaded document</p>
                    </div>
                    <span class="faculty-count">${documents.length} Documents</span>
                </div>

                ${documents.length ? `
                    <div class="faculty-document-list">
                        ${documents.map(x => `
                            <div class="faculty-document">
                                <div class="faculty-document-icon">
                                    <i class="bi bi-file-earmark-pdf"></i>
                                </div>
                                <div class="flex-grow-1">
                                    <h6>${esc(x.kind)}</h6>
                                    ${facultyStatus(x.status)}
                                    ${x.reason ? `<small class="text-muted">Reason: ${esc(x.reason)}</small>` : ''}
                                </div>
                                <div class="faculty-document-actions">
                                    <a class="btn faculty-view-btn"
                                       href="/api/faculty/documents/${x.id}/file"
                                       target="_blank" rel="noopener">
                                        <i class="bi bi-eye me-1"></i>View
                                    </a>
                                    <button class="btn faculty-approve-btn"
                                        onclick="verifyDocument(${x.id},'Approved',${id})">
                                        <i class="bi bi-check2 me-1"></i>Approve
                                    </button>
                                    <button class="btn faculty-reject-btn"
                                        onclick="verifyDocument(${x.id},'Rejected',${id})">
                                        <i class="bi bi-x-lg me-1"></i>Reject
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="faculty-empty">
                        <i class="bi bi-folder2-open"></i>
                        No documents have been uploaded.
                    </div>
                `}
            </div>

            <div class="faculty-section">
                <div class="faculty-section-heading">
                    <div class="faculty-section-icon">
                        <i class="bi bi-clipboard2-check"></i>
                    </div>
                    <div>
                        <h5>Final Review Recommendation</h5>
                        <p>Submit your recommendation to the admission administrator</p>
                    </div>
                </div>

                <label class="form-label fw-semibold">Faculty Remarks</label>
                <textarea id="rm" class="form-control faculty-remarks"
                    placeholder="Enter your observations and remarks..."></textarea>

                <div class="faculty-review-actions">
                    <button class="btn faculty-approve-btn"
                        ${eligible ? '' : 'disabled'}
                        onclick="reviewDecision(${id},'approve')">
                        <i class="bi bi-check-circle me-2"></i>Recommend Approval
                    </button>
                    <button class="btn faculty-reject-btn"
                        onclick="reviewDecision(${id},'reject')">
                        <i class="bi bi-x-circle me-2"></i>Recommend Rejection
                    </button>
                </div>

                ${!eligible ? `
                    <div class="faculty-warning">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        This applicant does not meet the course eligibility requirement.
                        Approval recommendation is disabled.
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}


async function verifyDocument(id,status,appId) {
    let reason = null;

    if (status === 'Rejected') {
        reason = prompt('Enter rejection reason');
        if (!reason) return;
    }

    await api(`/api/faculty/documents/${id}/verify`,'POST',{
        status,reason
    });

    reviewApplication(appId);
}


async function reviewDecision(id,recommendation) {
    const result = await api(`/api/faculty/applications/${id}/review`,'POST',{
        recommendation,
        remarks:$('rm').value
    });

    alert('Eligibility: ' + result.eligible);
    go('Assigned Applications');
}


async function addCourse() {
    await api('/api/admin/courses','POST',{
        name:$('cn').value,
        department:$('cd').value,
        intake:$('ci').value,
        min_percentage:$('cm').value,
        fee:$('cfee').value
    });

    alert('Course added');
    go('Courses');
}


async function assignFaculty(id) {
    const facultyId = Number($('fs'+id).value);
    if (!facultyId) return alert('Select a faculty member');

    await api(`/api/admin/applications/${id}/assign`,'POST',{
        faculty_id:facultyId
    });

    go('Applications');
}


async function confirmAdmission(id) {
    await api(`/api/admin/applications/${id}/confirm`,'POST');
    alert('Admission confirmed');
    go('Applications');
}


async function approveFaculty(id) {
    await api(`/api/admin/faculty/${id}/approve`,'POST');
    go('Faculty');
}


async function adminAction(path) {
    const result = await api('/api/admin/' + path,'POST');
    alert('Operation completed');
    console.log(result);
}


async function sendAnnouncement() {
    await api('/api/admin/notify','POST',{
        message:$('an').value
    });

    alert('Announcement sent');
    go('Announce');
}


draw();
