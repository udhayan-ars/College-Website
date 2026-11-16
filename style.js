
// ==========================================
// CAMPUS TRACK - TRANSPORT MANAGEMENT
// SUPABASE DATABASE CONNECTION
// ==========================================


// 1. SUPABASE CONNECTION

const SUPABASE_URL = "https://lbavigzrgdkbxsxamoty.supabase.co";

const SUPABASE_KEY = "sb_publishable_CFhHp87e9yJ8loaDJ7f3eg_Axattwgj";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
window.supabaseClient = supabaseClient;
// Protect dashboard using Supabase session
async function checkLoginSession() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data.session) {
        window.location.replace("login.html");
        return;
    }

    console.log("Login verified! Dashboard accessible.");
}

checkLoginSession();


// 2. DISPLAY CURRENT DATE

const dateElement = document.getElementById("currentDate");

if (dateElement) {
    dateElement.textContent = new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}


// 3. BUS DATA

let buses = [];


// Demo map positions (GPS integration comes later)

const demoPositions = [
    [
        [11.468, 77.855],
        [11.472, 77.860],
        [11.475, 77.865],
        [11.479, 77.870],
        [11.482, 77.875],
        [11.486, 77.880]
    ],
    [
        [11.475, 77.860],
        [11.477, 77.863],
        [11.480, 77.867],
        [11.482, 77.871],
        [11.484, 77.876],
        [11.486, 77.880]
    ],
    [
        [11.460, 77.850],
        [11.465, 77.855],
        [11.470, 77.860],
        [11.475, 77.866],
        [11.480, 77.872],
        [11.486, 77.880]
    ],
    [
        [11.455, 77.860],
        [11.462, 77.863],
        [11.470, 77.867],
        [11.477, 77.872],
        [11.482, 77.876],
        [11.486, 77.880]
    ]
];


// 4. INITIALIZE MAP

const map = L.map("map").setView(
    [11.477, 77.870],
    13
);


// 5. OPEN STREET MAP

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }
).addTo(map);


// 6. COLLEGE LOCATION

const collegeLocation = [11.486, 77.880];

L.marker(collegeLocation)
    .addTo(map)
    .bindPopup("<b>College Campus</b><br>Destination");


// 7. BUS ICON

const busIcon = L.divIcon({
    className: "bus-map-icon",
    html: "🚌",
    iconSize: [35, 35],
    iconAnchor: [17, 17]
});


// 8. MAP VARIABLES

let busMarker = null;
let routeLine = null;

let currentBusIndex = 0;
let currentPosition = 0;
let movementTimer = null;


// 9. FETCH BUS AND ROUTE DATA FROM SUPABASE

async function loadBuses() {

    console.log("Loading bus data...");

    const { data: busData, error: busError } =
        await supabaseClient
            .from("buses")
            .select("*")
            .order("id");

    if (busError) {
    console.error("SUPABASE ERROR DETAILS:", {
        message: busError.message,
        code: busError.code,
        details: busError.details,
        hint: busError.hint
    });

    alert("Database Error: " + busError.message);
    return;
}


    const { data: routeData, error: routeError } =
        await supabaseClient
            .from("routes")
            .select("*");

    if (routeError) {
        console.error("Route Error:", routeError);
        alert("Unable to load routes. Check Supabase permissions.");
        return;
    }


    // Combine buses and routes

    buses = busData.map((bus, index) => {

        const route = routeData.find(
            item => item.id === bus.route_id
        );

        return {

            number: bus.bus_number,

            route: route
                ? route.route_name
                : "Route not available",

            driver: bus.driver_name,

            status: bus.status,

            capacity: "Not available",

            eta: 10,

            positions: demoPositions[
                index % demoPositions.length
            ]

        };

    });


    console.log("Supabase Bus Data:", buses);


    // Load first bus

    if (buses.length > 0) {
        selectBus(0);
    } else {
        console.log("No buses found in database.");
    }

}


// 10. SELECT BUS

function selectBus(index) {

    if (!buses[index]) return;

    currentBusIndex = index;
    currentPosition = 0;

    const bus = buses[index];


    if (movementTimer) {
        clearInterval(movementTimer);
    }

    if (busMarker) {
        map.removeLayer(busMarker);
    }

    if (routeLine) {
        map.removeLayer(routeLine);
    }


    // Draw route

    routeLine = L.polyline(bus.positions, {
        color: "#2878df",
        weight: 5,
        opacity: 0.8
    }).addTo(map);


    // Add bus marker

    busMarker = L.marker(bus.positions[0], {
        icon: busIcon
    }).addTo(map);


    busMarker.bindPopup(
        "<b>" + bus.number + "</b><br>" +
        bus.route + "<br>" +
        "Driver: " + bus.driver + "<br>" +
        "Status: " + bus.status
    );


    map.fitBounds(routeLine.getBounds(), {
        padding: [30, 30]
    });


    // Update dashboard

    const updateElement = (id, value) => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    };

    updateElement("selectedBusName", bus.number);
    updateElement("selectedBusRoute", bus.route);
    updateElement("driverName", bus.driver);
    updateElement("busStatus", bus.status);
    updateElement("busCapacity", bus.capacity);
    updateElement("eta", bus.eta + " min");


    // Update selected button

    document.querySelectorAll(".bus-select").forEach(button => {
        button.classList.remove("selected");
    });

    const selectedButton = document.querySelector(
        '.bus-select[data-bus="' + index + '"]'
    );

    if (selectedButton) {
        selectedButton.classList.add("selected");
    }


    // Simulated movement

    movementTimer = setInterval(moveBus, 3000);

}


// 11. SIMULATE BUS MOVEMENT

function moveBus() {

    const bus = buses[currentBusIndex];

    if (!bus || !busMarker) return;

    currentPosition++;

    if (currentPosition >= bus.positions.length) {
        currentPosition = 0;
    }

    const newPosition = bus.positions[currentPosition];

    busMarker.setLatLng(newPosition);

    busMarker.setPopupContent(
        "<b>" + bus.number + "</b><br>" +
        bus.route + "<br>" +
        "Driver: " + bus.driver + "<br>" +
        "Status: " + bus.status
    );

    console.log("Bus location updated:", newPosition);

}


// 12. BUS SELECTION EVENTS

document.querySelectorAll(".bus-select").forEach(button => {

    button.addEventListener("click", function () {

        const index = Number(this.dataset.bus);

        selectBus(index);

    });

});


// 13. SIDEBAR NAVIGATION

const navigationLinks = document.querySelectorAll(".nav-link");

navigationLinks.forEach(link => {

    link.addEventListener("click", function () {

        navigationLinks.forEach(item => {
            item.classList.remove("active");
        });

        this.classList.add("active");

    });

});


// 14. LOAD DATABASE DATA

loadBuses();


// CampusTrack Logout Function

document.getElementById("logoutButton").addEventListener("click", async function () {

    console.log("Logout button clicked!");

    const { error } = await window.supabaseClient.auth.signOut();

    if (error) {
        console.error("Logout error:", error);
        alert(error.message);
        return;
    }

    window.location.replace("login.html");

});