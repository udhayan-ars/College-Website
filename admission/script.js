
let selectedRole = "";

const services = {
    Student: [
        "Exam & Bus Fees Payment",
        "Payment History & PDF Receipt",
        "Examination Timetable",
        "Hall Ticket Generation",
        "Hall Number Search",
        "Internal Marks",
        "Semester Results & CGPA",
        "Attendance Management",
        "Online Leave Application",
        "Notifications & Announcements",
        "Scholarship Management",
        "Online Certificate Requests",
        "Parent Portal",
        "Grievance Submission",
        "Academic Performance Analytics",
        "Digital Student ID with QR Code",
        "Library Integration"
    ],

    Faculty: [
        "Student Details",
        "Attendance Management",
        "Internal Marks Upload",
        "Semester Performance",
        "Leave Application Approval",
        "Grievance Review",
        "Notifications & Announcements",
        "Academic Performance Reports"
    ],

    Admin: [
        "Student Management",
        "Faculty Management",
        "Admission Management",
        "Hostel Management",
        "Canteen Management",
        "Bus Tracking Management",
        "Exam & Bus Fee Management",
        "Payment Reports",
        "Scholarship Management",
        "Certificate Approval",
        "User Account Management",
        "Grievance Management",
        "Overall Reports & Analytics"
    ]
};

function selectRole(role) {
    selectedRole = role;

    document.getElementById("rolePage").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");

    document.getElementById("loginTitle").textContent =
        role + " Login";

    document.getElementById("loginMessage").textContent = "";
}

function goBack() {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("rolePage").classList.remove("hidden");
}

function login(event) {
    event.preventDefault();

    const userId = document.getElementById("userId").value.trim();
    const password = document.getElementById("password").value;

    if (!userId || !password) {
        document.getElementById("loginMessage").textContent =
            "Please enter your login details.";
        return;
    }

    // Frontend demonstration only.
    // Real authentication must be implemented using a backend.

    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("dashboard").classList.remove("hidden");

    document.getElementById("welcomeTitle").textContent =
        "Welcome, " + selectedRole + "!";

    document.getElementById("welcomeText").textContent =
        "You are logged in as " + selectedRole + ".";

    const serviceList = document.getElementById("serviceList");

    serviceList.innerHTML = "";

    services[selectedRole].forEach(function(service) {
        const card = document.createElement("div");
        card.className = "service";

        const heading = document.createElement("h3");
        heading.textContent = service;

        const description = document.createElement("p");
        description.textContent =
            "Access your " + service.toLowerCase() + " services.";

        card.appendChild(heading);
        card.appendChild(description);
        serviceList.appendChild(card);
    });
}

function logout() {
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("rolePage").classList.remove("hidden");

    document.getElementById("userId").value = "";
    document.getElementById("password").value = "";
    selectedRole = "";
}
