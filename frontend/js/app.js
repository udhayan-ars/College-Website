
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

const badge = value =>
    `<span class="badge bg-primary">${esc(value || 'N/A')}</span>`;

const tbl = (headers, rows) => `
<div class="table-responsive">
<table class="table table-bordered table-hover bg-white align-middle">
<thead class="table-light"><tr>
${headers.map(h => `<th>${esc(h)}</th>`).join('')}
</tr></thead>
<tbody>
${rows.length ? rows.map(row => `<tr>${row.map(cell =>
    `<td>${cell ?? ''}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}" class="text-center text-muted">No records found</td></tr>`}
</tbody></table></div>`;

function setRole(newRole) {
    role = newRole;
    reg = false;

    document.querySelectorAll('.role-button').forEach(button => {
        button.classList.toggle(
            'active',
            button.dataset.role === newRole
        );
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


/* =====================================================
   ROLE MENUS
===================================================== */

const SV = {
    student: [
        'Dashboard',
        'Profile & ID',
        'Application',
        'Academic Details',
        'Documents',
        'Admission Fee',
        'Attendance',
        'Internal Marks',
        'Results',
        'Exam Timetable',
        'Hall Tickets',
        'Fees',
        'Leave Application',
        'Scholarships',
        'Certificate Requests',
        'Grievances',
        'Library',
        'Notifications',
        'Merit & Seat'
    ],

    faculty: [
        'Assigned Applications'
    ],

    admin: [
        'Dashboard',
        'Courses',
        'Applications',
        'Faculty',
        'Merit & Seats',
        'Announce'
    ]
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

    async Dashboard() {
        const d = await api('/api/student/dashboard');

        const attendance = d.attendance_percentage == null
            ? '—'
            : esc(d.attendance_percentage) + '%';

        const stats = [
            {
                label: 'My Course',
                value: d.course || 'Not allotted',
                icon: 'bi-mortarboard',
                color: '#4779e6'
            },
            {
                label: 'Attendance',
                value: attendance,
                icon: 'bi-calendar-check',
                color: '#24a477'
            },
            {
                label: 'Total Subjects',
                value: d.subject_count ?? 0,
                icon: 'bi-book',
                color: '#9b70dc'
            },
            {
                label: 'Pending Fees',
                value: d.pending_fees ?? 0,
                icon: 'bi-wallet2',
                color: '#e59b38'
            }
        ];

        $('main').innerHTML = `
            <style>
                .sd-wrap {
                    color: #1d2b45;
                    width: 100%;
                }

                .sd-welcome {
                    background: linear-gradient(115deg,#203d78,#315fbd);
                    color: white;
                    padding: 28px;
                    border-radius: 18px;
                    margin-bottom: 22px;
                    position: relative;
                    overflow: hidden;
                }

                .sd-welcome h3 {
                    font-weight: 700;
                }

                .sd-welcome p {
                    color: #e0e9ff;
                }

                .sd-welcome-icon {
                    font-size: 75px;
                    opacity: .2;
                }

                .sd-stats {
                    display: grid;
                    grid-template-columns: repeat(4,minmax(0,1fr));
                    gap: 16px;
                    margin-bottom: 22px;
                }

                .sd-stat {
                    background: white;
                    border: 1px solid #e6ebf3;
                    border-radius: 15px;
                    padding: 20px;
                    box-shadow: 0 5px 20px rgba(25,40,70,.05);
                    min-width: 0;
                    transition: transform .2s, box-shadow .2s;
                }

                .sd-stat:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 25px rgba(25,40,70,.09);
                }

                .sd-stat-icon {
                    width: 43px;
                    height: 43px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 21px;
                    margin-bottom: 15px;
                }

                .sd-stat h4 {
                    font-size: 21px;
                    font-weight: 700;
                    overflow-wrap: anywhere;
                }

                .sd-stat small {
                    color: #8791a4;
                }

                .sd-panel {
                    background: white;
                    border: 1px solid #e6ebf3;
                    border-radius: 15px;
                    padding: 22px;
                    box-shadow: 0 5px 20px rgba(25,40,70,.04);
                    height: 100%;
                }

                .sd-panel h5 {
                    font-weight: 700;
                    color: #203d78;
                }

                .sd-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    padding: 13px 0;
                    border-bottom: 1px solid #edf0f5;
                }

                .sd-info:last-child {
                    border: 0;
                }

                .sd-info span:first-child {
                    color: #8791a4;
                }

                .sd-info strong {
                    text-align: right;
                    overflow-wrap: anywhere;
                }

                .sd-actions {
                    display: grid;
                    grid-template-columns: repeat(2,minmax(0,1fr));
                    gap: 12px;
                    margin-top: 18px;
                }

                .sd-action {
                    border: 1px solid #e6ebf3;
                    background: #f8faff;
                    color: #203d78;
                    padding: 15px;
                    border-radius: 12px;
                    text-align: left;
                    font-weight: 600;
                    transition: .2s;
                    cursor: pointer;
                }

                .sd-action:hover {
                    background: #eaf0ff;
                    border-color: #315fbd;
                    transform: translateY(-2px);
                }

                .sd-action i {
                    display: block;
                    font-size: 22px;
                    margin-bottom: 8px;
                }

                @media(max-width: 900px) {
                    .sd-stats {
                        grid-template-columns: repeat(2,minmax(0,1fr));
                    }
                }

                @media(max-width: 500px) {
                    .sd-welcome {
                        padding: 20px;
                    }

                    .sd-welcome h3 {
                        font-size: 21px;
                    }

                    .sd-welcome-icon {
                        font-size: 48px;
                    }

                    .sd-stats {
                        gap: 10px;
                    }

                    .sd-stat {
                        padding: 14px;
                    }

                    .sd-stat h4 {
                        font-size: 17px;
                    }

                    .sd-panel {
                        padding: 16px;
                    }

                    .sd-actions {
                        grid-template-columns: 1fr;
                    }

                    .sd-info {
                        font-size: 13px;
                    }
                }
            </style>

            <div class="sd-wrap">

                <section class="sd-welcome">
                    <div class="row align-items-center">
                        <div class="col-9">
                            <p class="mb-2">STUDENT PORTAL</p>
                            <h3>Welcome back, ${esc(d.name || U.name)}!</h3>
                            <p class="mb-0">
                                Here's your academic and admission overview.
                            </p>
                        </div>

                        <div class="col-3 text-end">
                            <i class="bi bi-mortarboard-fill sd-welcome-icon"></i>
                        </div>
                    </div>
                </section>

                <div class="sd-stats">
                    ${stats.map(s => `
                        <div class="sd-stat">
                            <div class="sd-stat-icon"
                                style="background:${s.color}18;color:${s.color}">
                                <i class="bi ${s.icon}"></i>
                            </div>

                            <small>${esc(s.label)}</small>
                            <h4 class="mt-2 mb-0">${esc(s.value)}</h4>
                        </div>
                    `).join('')}
                </div>

                <div class="row g-3">

                    <div class="col-lg-6">
                        <div class="sd-panel">
                            <h5>
                                <i class="bi bi-person-vcard text-primary me-2"></i>
                                Admission Overview
                            </h5>

                            <div class="sd-info">
                                <span>Admission Status</span>
                                <strong>${badge(d.admission_status)}</strong>
                            </div>

                            <div class="sd-info">
                                <span>Register Number</span>
                                <strong>${esc(d.register_no || 'Not allotted')}</strong>
                            </div>

                            <div class="sd-info">
                                <span>Department</span>
                                <strong>${esc(d.department || 'Not assigned')}</strong>
                            </div>

                            <div class="sd-info">
                                <span>Course</span>
                                <strong>${esc(d.course || 'Not allotted')}</strong>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-6">
                        <div class="sd-panel">
                            <h5>
                                <i class="bi bi-lightning-charge text-primary me-2"></i>
                                Quick Actions
                            </h5>

                            <div class="sd-actions">

                                <button class="sd-action"
                                    onclick="openStudentPage('Application')">
                                    <i class="bi bi-file-earmark-text"></i>
                                    My Application
                                </button>

                                <button class="sd-action"
                                    onclick="openStudentPage('Documents')">
                                    <i class="bi bi-cloud-arrow-up"></i>
                                    Upload Documents
                                </button>

                                <button class="sd-action"
                                    onclick="openStudentPage('Attendance')">
                                    <i class="bi bi-calendar-check"></i>
                                    View Attendance
                                </button>

                                <button class="sd-action"
                                    onclick="openStudentPage('Fees')">
                                    <i class="bi bi-wallet2"></i>
                                    Fee Details
                                </button>

                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;
    },

    async 'Profile & ID'() {
        const p = await api('/api/student/profile');

        $('main').innerHTML = card(`
            <div class="text-center mb-3">
                <i class="bi bi-person-circle display-1 text-primary"></i>
                <h4>${esc(p.name)}</h4>
                <p class="text-muted">Student Digital Profile</p>
            </div>
            ${tbl(['Field', 'Details'], [
                ['Student ID', esc(p.student_code)],
                ['Register Number', esc(p.register_no || 'Not allotted')],
                ['Email', esc(p.email)],
                ['Mobile', esc(p.mobile)],
                ['Date of Birth', esc(p.dob)],
                ['Gender', esc(p.gender)],
                ['Department', esc(p.department)],
                ['Course', esc(p.course || 'Not allotted')]
            ])}
        `);
    },

    async Application() {
        const a = await api('/api/student/application');
        const courses = await api('/api/student/courses');

        $('main').innerHTML = card(`
            <h5>Admission Application</h5>
            <p>Application Number: <b>${esc(a.app_no)}</b></p>
            <p>Status: ${badge(a.status)}</p>

            <label class="form-label">Select Course</label>
            <select id="crs" class="form-select mb-3">
                ${courses.map(c => `
                    <option value="${c.id}" ${c.id == a.course_id ? 'selected' : ''}>
                        ${esc(c.name)} - ${esc(c.fee)}
                    </option>`).join('')}
            </select>

            <button class="btn btn-primary" onclick="saveCourse()">Save Course</button>
            <button class="btn btn-success" onclick="submitAdmission()">Submit Application</button>
        `);
    },

    async 'Academic Details'() {
        const a = await api('/api/student/application');
        const d = a.details || {};

        const section = (label, key) => `
            <div class="col-md-6 mb-3">
                <h6>${label}</h6>
                <input id="${key}b" class="form-control mb-2"
                    placeholder="Board" value="${esc(d[key]?.board || '')}">
                <input id="${key}y" class="form-control mb-2"
                    placeholder="Passing year" value="${esc(d[key]?.year || '')}">

                ${[0,1,2].map(i => `
                    <div class="input-group mb-2">
                        <input id="${key}s${i}" class="form-control"
                            placeholder="Subject"
                            value="${esc(d[key]?.subjects?.[i]?.name || '')}">
                        <input id="${key}m${i}" type="number" class="form-control"
                            placeholder="Marks"
                            value="${esc(d[key]?.subjects?.[i]?.marks || '')}">
                        <input id="${key}x${i}" type="number" class="form-control"
                            placeholder="Maximum"
                            value="${esc(d[key]?.subjects?.[i]?.max ?? 100)}">
                    </div>`).join('')}
            </div>`;

        $('main').innerHTML = card(`
            <h5>Academic Information</h5>

            <input id="guard" class="form-control mb-2"
                placeholder="Parent / Guardian name"
                value="${esc(d.guardian || '')}">

            <textarea id="addr" class="form-control mb-3"
                placeholder="Permanent address">${esc(d.address || '')}</textarea>

            <div class="row">
                ${section('10th Standard', 'tenth')}
                ${section('12th Standard', 'twelfth')}
            </div>

            <p>Current calculated percentage: <b>${esc(a.percentage ?? '-')}%</b></p>
            <button class="btn btn-primary" onclick="saveAcad()">Save Academic Details</button>
        `);
    },

    async Documents() {
        const a = await api('/api/student/application');

        const kinds = [
            '10th Marksheet',
            '12th Marksheet',
            'Transfer Certificate',
            'Community Certificate',
            'Photograph',
            'Government ID'
        ];

        $('main').innerHTML = kinds.map(kind => {
            const doc = a.documents.find(d => d.kind === kind);

            return card(`
                <b>${esc(kind)}</b>
                ${doc ? badge(doc.status) : badge('Not uploaded')}
                ${doc?.reason ? `<p class="text-danger">${esc(doc.reason)}</p>` : ''}
                <input type="file" id="f${kind.replace(/\W/g,'')}"
                    class="form-control my-2">
                <button class="btn btn-primary btn-sm"
                    onclick="up('${kind}')">Upload Document</button>
                ${doc ? `<a class="ms-2" href="/api/student/documents/${encodeURIComponent(kind)}" target="_blank">View</a>` : ''}
            `);
        }).join('');
    },

    async 'Admission Fee'() {
        const a = await api('/api/student/application');

        $('main').innerHTML =
            card(`<h5>Admission Application Fee</h5>
                <div class="alert alert-warning">
                    Demo payment only. No real money will be charged.
                </div>
                <button class="btn btn-primary"
                    onclick="payAdmission()">Pay Application Fee</button>`) +
            tbl(['Reference', 'Amount', 'Mode', 'Status', 'Date'],
                a.payments.map(p => [
                    esc(p.ref), esc(p.amount), esc(p.mode),
                    badge(p.status), esc(p.date?.slice(0,10))
                ]));
    },

    async Attendance() {
        const d = await api('/api/student/attendance');

        $('main').innerHTML =
            card('<h5>Subject-wise Attendance</h5>') +
            tbl(['Subject', 'Code', 'Total Classes', 'Attended', 'Absent', 'Percentage'],
                d.summary.map(s => [
                    esc(s.subject), esc(s.subject_code),
                    s.total_classes, s.attended, s.absent,
                    s.percentage == null ? '-' : s.percentage + '%'
                ])) +
            card('<h5>Attendance History</h5>') +
            tbl(['Subject', 'Date', 'Period', 'Status', 'Remarks'],
                d.records.map(r => [
                    esc(r.subject), esc(r.date), esc(r.period),
                    badge(r.status), esc(r.remarks)
                ]));
    },

    async 'Internal Marks'() {
        const rows = await api('/api/student/internal-marks');

        $('main').innerHTML = tbl(
            ['Subject', 'Code', 'Assessment', 'Marks', 'Maximum', 'Remarks'],
            rows.map(r => [
                esc(r.subject), esc(r.subject_code),
                esc(r.assessment), esc(r.marks),
                esc(r.maximum), esc(r.remarks)
            ])
        );
    },

    async Results() {
        const d = await api('/api/student/results');

        $('main').innerHTML =
            card(`<h5>Academic Performance</h5>
                  <h3>CGPA: ${esc(d.cgpa ?? 'Not published')}</h3>`) +
            tbl(['Semester', 'Subject', 'Internal', 'External',
                 'Total', 'Grade', 'Grade Points', 'Credits'],
                d.results.map(r => [
                    esc(r.semester), esc(r.subject),
                    esc(r.internal), esc(r.external),
                    esc(r.total), badge(r.grade),
                    esc(r.grade_points), esc(r.credits)
                ]));
    },

    async 'Exam Timetable'() {
        const rows = await api('/api/student/exam-timetable');

        $('main').innerHTML = tbl(
            ['Exam', 'Subject', 'Code', 'Date', 'Start', 'End', 'Room', 'Instructions'],
            rows.map(r => [
                esc(r.exam_type), esc(r.subject), esc(r.subject_code),
                esc(r.date), esc(r.start_time), esc(r.end_time),
                esc(r.room), esc(r.instructions)
            ])
        );
    },

    async 'Hall Tickets'() {
        const rows = await api('/api/student/hall-tickets');

        $('main').innerHTML = tbl(
            ['Hall Ticket Number', 'Semester', 'Exam', 'Eligible', 'Issued At'],
            rows.map(r => [
                `<b>${esc(r.number)}</b>`,
                esc(r.semester), esc(r.exam_type),
                badge(r.eligible ? 'Eligible' : 'Not Eligible'),
                esc(r.issued_at?.slice(0,10))
            ])
        );
    },

    async Fees() {
        const rows = await api('/api/student/fees');

        $('main').innerHTML =
            card('<div class="alert alert-warning mb-0">Demo payment only. No real money is charged.</div>') +
            tbl(['Fee Type', 'Amount', 'Due Date', 'Status', 'Reference', 'Action'],
                rows.map(f => [
                    esc(f.type), esc(f.amount), esc(f.due_date),
                    badge(f.status), esc(f.reference || '-'),
                    f.status === 'Pending'
                        ? `<button class="btn btn-sm btn-primary" onclick="payFee(${f.id})">Pay Demo Fee</button>`
                        : badge('Paid')
                ]));
    },

    async 'Leave Application'() {
        const rows = await api('/api/student/leaves');

        $('main').innerHTML =
            card(`
                <h5>Apply for Leave</h5>
                <label>From Date</label>
                <input type="date" id="lf" class="form-control mb-2">
                <label>To Date</label>
                <input type="date" id="lt" class="form-control mb-2">
                <label>Reason</label>
                <textarea id="lr" class="form-control mb-2"></textarea>
                <button class="btn btn-primary" onclick="applyLeave()">Submit Leave</button>
            `) +
            tbl(['From', 'To', 'Reason', 'Status', 'Reviewer Note'],
                rows.map(r => [
                    esc(r.from_date), esc(r.to_date),
                    esc(r.reason), badge(r.status),
                    esc(r.reviewer_note)
                ]));
    },

    async Scholarships() {
        const rows = await api('/api/student/scholarships');

        $('main').innerHTML = rows.map(s => card(`
            <h5>${esc(s.title)}</h5>
            <p>${esc(s.description)}</p>
            <p><b>Eligibility:</b> ${esc(s.eligibility)}</p>
            <p><b>Amount:</b> ${esc(s.amount)}</p>
            <p>Status: ${badge(s.application_status || 'Not Applied')}</p>
            ${!s.application_status
                ? `<textarea id="sr${s.id}" class="form-control mb-2"
                     placeholder="Why are you applying?"></textarea>
                   <button class="btn btn-primary"
                     onclick="applyScholarship(${s.id})">Apply</button>`
                : ''}
        `)).join('') || card('No scholarships available currently.');
    },

    async 'Certificate Requests'() {
        const rows = await api('/api/student/certificates');

        $('main').innerHTML =
            card(`
                <h5>Request a Certificate</h5>
                <select id="ct" class="form-select mb-2">
                    <option>Bonafide Certificate</option>
                    <option>Transfer Certificate</option>
                    <option>Course Completion Certificate</option>
                    <option>Character Certificate</option>
                    <option>Fee Certificate</option>
                </select>
                <textarea id="cp" class="form-control mb-2"
                    placeholder="Purpose of certificate"></textarea>
                <button class="btn btn-primary" onclick="requestCertificate()">Submit Request</button>
            `) +
            tbl(['Certificate', 'Purpose', 'Status', 'Admin Note'],
                rows.map(r => [
                    esc(r.type), esc(r.purpose),
                    badge(r.status), esc(r.admin_note)
                ]));
    },

    async Grievances() {
        const rows = await api('/api/student/grievances');

        $('main').innerHTML =
            card(`
                <h5>Submit a Grievance</h5>
                <select id="gc" class="form-select mb-2">
                    <option>Academic</option>
                    <option>Examination</option>
                    <option>Fees</option>
                    <option>Faculty</option>
                    <option>Infrastructure</option>
                    <option>Other</option>
                </select>
                <input id="gs" class="form-control mb-2" placeholder="Subject">
                <textarea id="gd" class="form-control mb-2"
                    placeholder="Describe your grievance"></textarea>
                <button class="btn btn-primary" onclick="submitGrievance()">Submit Grievance</button>
            `) +
            tbl(['Category', 'Subject', 'Description', 'Status', 'Response'],
                rows.map(r => [
                    esc(r.category), esc(r.subject),
                    esc(r.description), badge(r.status),
                    esc(r.response)
                ]));
    },

    async Library() {
        const [books, loans] = await Promise.all([
            api('/api/student/library/books'),
            api('/api/student/library/loans')
        ]);

        $('main').innerHTML =
            card('<h5>Available Library Books</h5>') +
            tbl(['Accession No.', 'Title', 'Author', 'Category', 'Available Copies'],
                books.map(b => [
                    esc(b.accession_number), esc(b.title),
                    esc(b.author), esc(b.category), esc(b.available_copies)
                ])) +
            card('<h5>My Library Loans</h5>') +
            tbl(['Book', 'Issue Date', 'Due Date', 'Return Date', 'Status'],
                loans.map(l => [
                    esc(l.book), esc(l.issue_date), esc(l.due_date),
                    esc(l.return_date), badge(l.status)
                ]));
    },

    async Notifications() {
        const rows = await api('/api/student/notifications');

        $('main').innerHTML = tbl(
            ['Notification', 'Date'],
            rows.map(n => [esc(n.m), esc(n.at?.slice(0,16))])
        );
    },

    async Status() {
        const a = await api('/api/student/application');

        $('main').innerHTML =
            card(`Current Application Status: ${badge(a.status)}`) +
            tbl(['Status', 'Note', 'Date'],
                a.history.map(h => [
                    badge(h.status), esc(h.note), esc(h.at?.slice(0,16))
                ]));
    },

    async 'Merit & Seat'() {
        const [a, s] = await Promise.all([
            api('/api/student/application'),
            api('/api/student/allocation')
        ]);

        $('main').innerHTML =
            card(`<h5>Merit Details</h5>
                <p>Rank: <b>${esc(a.rank ?? 'Not published')}</b></p>
                <p>Merit Score: <b>${esc(a.merit_score ?? '-')}</b></p>`) +
            card(s
                ? `<h5>Seat Allocation</h5>
                   <p>Course: ${esc(s.course)}</p>
                   <p>Status: ${badge(s.status)}</p>
                   <p>Register No: ${esc(s.register_no || '-')}</p>
                   ${s.status === 'Offered'
                     ? `<button class="btn btn-success" onclick="respondSeat('accept')">Accept</button>
                        <button class="btn btn-danger" onclick="respondSeat('decline')">Decline</button>`
                     : ''}`
                : 'No seat allocated yet.');
    }
},


/* =====================================================
   FACULTY PORTAL - EXISTING ADMISSION REVIEW
===================================================== */

faculty: {
    async 'Assigned Applications'() {
        const rows = await api('/api/faculty/applications');

        $('main').innerHTML = tbl(
            ['Application No', 'Name', 'Course', 'Percentage', 'Status', 'Action'],
            rows.map(a => [
                esc(a.app_no), esc(a.name), esc(a.course),
                esc(a.percentage), badge(a.status),
                `<button class="btn btn-sm btn-primary" onclick="reviewApplication(${a.id})">Review</button>`
            ])
        );
    }
},


/* =====================================================
   ADMIN PORTAL - EXISTING ADMISSION MANAGEMENT
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
            tbl(['Course', 'Applications'],
                s.by_course.map(x => [esc(x.course), esc(x.count)]));
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
        const [rows, faculty] = await Promise.all([
            api('/api/admin/applications'),
            api('/api/admin/faculty')
        ]);

        const options = faculty.filter(f => f.approved)
            .map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('');

        $('main').innerHTML = tbl(
            ['Application', 'Student', 'Course', 'Status', 'Recommendation', 'Rank', 'Actions'],
            rows.map(a => [
                esc(a.app_no), esc(a.name), esc(a.course),
                badge(a.status), esc(a.recommendation), esc(a.rank),
                `<select id="fs${a.id}" class="form-select form-select-sm mb-1">${options}</select>
                 <button class="btn btn-sm btn-primary" onclick="assignFaculty(${a.id})">Assign</button>
                 <button class="btn btn-sm btn-success" onclick="confirmAdmission(${a.id})">Confirm</button>`
            ])
        );
    },

    async Faculty() {
        const rows = await api('/api/admin/faculty');

        $('main').innerHTML = tbl(
            ['Name', 'Department', 'Approved', 'Action'],
            rows.map(f => [
                esc(f.name), esc(f.dept),
                badge(f.approved ? 'Approved' : 'Pending'),
                f.approved ? '' :
                    `<button class="btn btn-sm btn-primary"
                        onclick="approveFaculty(${f.id})">Approve</button>`
            ])
        );
    },

    async 'Merit & Seats'() {
        $('main').innerHTML = card(`
            <h5>Merit and Seat Allocation</h5>
            <button class="btn btn-primary me-2 mb-2"
                onclick="adminAction('merit/calculate')">1. Calculate Merit</button>
            <button class="btn btn-warning me-2 mb-2"
                onclick="adminAction('merit/publish')">2. Publish Merit</button>
            <button class="btn btn-success mb-2"
                onclick="adminAction('allocate')">3. Allocate Seats</button>
        `);
    },

    async Announce() {
        $('main').innerHTML = card(`
            <h5>Send Announcement</h5>
            <textarea id="an" class="form-control mb-2"
                placeholder="Enter announcement"></textarea>
            <button class="btn btn-primary" onclick="sendAnnouncement()">Send Announcement</button>
        `);
    }
}

};


/* =====================================================
   STUDENT QUICK ACTION NAVIGATION
===================================================== */

function openStudentPage(page) {
    const button = Array.from(
        document.querySelectorAll('#nav .btn')
    ).find(item => item.textContent.trim().includes(page));

    if (button) {
        go(page, button);
    } else {
        alert('This page is not available in your menu.');
    }
}


/* =====================================================
   STUDENT ACTIONS
===================================================== */

async function saveCourse() {
    await api('/api/student/application', 'PUT', {
        course_id: Number($('crs').value)
    });
    alert('Course saved');
    go('Application');
}

async function submitAdmission() {
    await api('/api/student/submit', 'POST');
    alert('Application submitted');
    go('Application');
}

async function saveAcad() {
    const group = key => ({
        board: $(key + 'b').value,
        year: $(key + 'y').value,
        subjects: [0,1,2]
            .filter(i => $(key + 'm' + i).value !== '')
            .map(i => ({
                name: $(key + 's' + i).value,
                marks: Number($(key + 'm' + i).value),
                max: Number($(key + 'x' + i).value)
            }))
    });

    await api('/api/student/application', 'PUT', {
        details: {
            tenth: group('tenth'),
            twelfth: group('twelfth'),
            guardian: $('guard').value,
            address: $('addr').value
        }
    });

    alert('Academic details saved');
    go('Academic Details');
}

async function up(kind) {
    const file = $('f' + kind.replace(/\W/g, '')).files[0];

    if (!file) return alert('Please choose a file');

    const form = new FormData();
    form.append('kind', kind);
    form.append('file', file);

    await api('/api/student/documents', 'POST', null, form);
    alert('Document uploaded');
    go('Documents');
}

async function payAdmission() {
    await api('/api/student/payment', 'POST');
    alert('Demo payment recorded');
    go('Admission Fee');
}

async function payFee(id) {
    const result = await api(`/api/student/fees/${id}/pay`, 'POST');
    alert(result.message + '\nReference: ' + result.reference);
    go('Fees');
}

async function applyLeave() {
    await api('/api/student/leaves', 'POST', {
        from_date: $('lf').value,
        to_date: $('lt').value,
        reason: $('lr').value
    });

    alert('Leave application submitted');
    go('Leave Application');
}

async function applyScholarship(id) {
    await api(`/api/student/scholarships/${id}/apply`, 'POST', {
        reason: $('sr' + id).value
    });

    alert('Scholarship application submitted');
    go('Scholarships');
}

async function requestCertificate() {
    await api('/api/student/certificates', 'POST', {
        certificate_type: $('ct').value,
        purpose: $('cp').value
    });

    alert('Certificate request submitted');
    go('Certificate Requests');
}

async function submitGrievance() {
    await api('/api/student/grievances', 'POST', {
        category: $('gc').value,
        subject: $('gs').value,
        description: $('gd').value
    });

    alert('Grievance submitted');
    go('Grievances');
}

async function respondSeat(action) {
    await api('/api/student/allocation/' + action, 'POST');
    alert('Your response has been recorded');
    go('Merit & Seat');
}


/* =====================================================
   FACULTY / ADMIN ACTIONS
===================================================== */

async function reviewApplication(id) {
    const d = await api('/api/faculty/applications/' + id);

    $('main').innerHTML =
        card(`<h5>${esc(d.name)} - ${esc(d.app_no)}</h5>
              Percentage: ${esc(d.percentage)}%
              <br>Course minimum: ${esc(d.course?.min_percentage)}%`) +
        d.documents.map(x => card(`
            ${esc(x.kind)} ${badge(x.status)}
            <a href="/api/faculty/documents/${x.id}/file" target="_blank">View</a>
            <button class="btn btn-sm btn-success"
                onclick="verifyDocument(${x.id},'Approved',${id})">Approve</button>
            <button class="btn btn-sm btn-danger"
                onclick="verifyDocument(${x.id},'Rejected',${id})">Reject</button>
        `)).join('') +
        card(`
            <textarea id="rm" class="form-control mb-2"
                placeholder="Faculty remarks"></textarea>
            <button class="btn btn-success"
                onclick="reviewDecision(${id},'approve')">Recommend Approval</button>
            <button class="btn btn-danger"
                onclick="reviewDecision(${id},'reject')">Recommend Rejection</button>
        `);
}

async function verifyDocument(id, status, appId) {
    let reason = null;

    if (status === 'Rejected') {
        reason = prompt('Enter rejection reason');
        if (!reason) return;
    }

    await api(`/api/faculty/documents/${id}/verify`, 'POST', {
        status, reason
    });

    reviewApplication(appId);
}

async function reviewDecision(id, recommendation) {
    const result = await api(`/api/faculty/applications/${id}/review`, 'POST', {
        recommendation,
        remarks: $('rm').value
    });

    alert('Eligibility: ' + result.eligible);
    go('Assigned Applications');
}

async function addCourse() {
    await api('/api/admin/courses', 'POST', {
        name: $('cn').value,
        department: $('cd').value,
        intake: $('ci').value,
        min_percentage: $('cm').value,
        fee: $('cfee').value
    });

    alert('Course added');
    go('Courses');
}

async function assignFaculty(id) {
    const facultyId = Number($('fs' + id).value);

    if (!facultyId) return alert('Select a faculty member');

    await api(`/api/admin/applications/${id}/assign`, 'POST', {
        faculty_id: facultyId
    });

    go('Applications');
}

async function confirmAdmission(id) {
    await api(`/api/admin/applications/${id}/confirm`, 'POST');
    alert('Admission confirmed');
    go('Applications');
}

async function approveFaculty(id) {
    await api(`/api/admin/faculty/${id}/approve`, 'POST');
    go('Faculty');
}

async function adminAction(path) {
    const result = await api('/api/admin/' + path, 'POST');
    alert('Operation completed');
    console.log(result);
}

async function sendAnnouncement() {
    await api('/api/admin/notify', 'POST', {
        message: $('an').value
    });

    alert('Announcement sent');
    go('Announce');
}

draw();

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
