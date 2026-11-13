
// ==========================================
// CAMPUS TRACK - TRANSPORT MANAGEMENT
// ==========================================


// 1. DISPLAY CURRENT DATE

const dateElement = document.getElementById("currentDate");

if (dateElement) {
    const today = new Date();

    dateElement.textContent = today.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}


// 2. BUS DATA

const buses = [
    {
        number: "TN 30 AB 1234",
        route: "Salem - College Route",
        driver: "Ramesh Kumar",
        status: "Running",
        capacity: "32 / 50",
        eta: 10,
        positions: [
            [11.468, 77.855],
            [11.472, 77.860],
            [11.475, 77.865],
            [11.479, 77.870],
            [11.482, 77.875],
            [11.486, 77.880]
        ]
    },

    {
        number: "TN 30 CD 5678",
        route: "Sankari - College Route",
        driver: "Suresh Kumar",
        status: "Running",
        capacity: "28 / 50",
        eta: 8,
        positions: [
            [11.475, 77.860],
            [11.477, 77.863],
            [11.480, 77.867],
            [11.482, 77.871],
            [11.484, 77.876],
            [11.486, 77.880]
        ]
    },

    {
        number: "TN 30 EF 9012",
        route: "Erode - College Route",
        driver: "Arun Kumar",
        status: "Delayed",
        capacity: "40 / 50",
        eta: 20,
        positions: [
            [11.460, 77.850],
            [11.465, 77.855],
            [11.470, 77.860],
            [11.475, 77.866],
            [11.480, 77.872],
            [11.486, 77.880]
        ]
    },

    {
        number: "TN 30 GH 3456",
        route: "Edappadi - College Route",
        driver: "Prakash",
        status: "Running",
        capacity: "35 / 50",
        eta: 12,
        positions: [
            [11.455, 77.860],
            [11.462, 77.863],
            [11.470, 77.867],
            [11.477, 77.872],
            [11.482, 77.876],
            [11.486, 77.880]
        ]
    }
];


// 3. INITIALIZE LEAFLET MAP

const map = L.map("map").setView(
    [11.477, 77.870],
    13
);


// 4. LOAD OPENSTREETMAP

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }
).addTo(map);


// 5. COLLEGE LOCATION

const collegeLocation = [11.486, 77.880];

L.marker(collegeLocation)
    .addTo(map)
    .bindPopup("<b>College Campus</b><br>Destination");


// 6. BUS ICON

const busIcon = L.divIcon({
    className: "bus-map-icon",
    html: "🚌",
    iconSize: [35, 35],
    iconAnchor: [17, 17]
});


// 7. MAP OBJECTS

let busMarker = null;
let routeLine = null;
let currentBusIndex = 0;
let currentPosition = 0;
let movementTimer = null;


// 8. DISPLAY SELECTED BUS

function selectBus(index) {

    currentBusIndex = index;
    currentPosition = 0;

    const bus = buses[index];

    // Stop previous movement
    if (movementTimer) {
        clearInterval(movementTimer);
    }

    // Remove old map objects
    if (busMarker) {
        map.removeLayer(busMarker);
    }

    if (routeLine) {
        map.removeLayer(routeLine);
    }

    // Draw selected bus route
    routeLine = L.polyline(bus.positions, {
        color: "#2878df",
        weight: 5,
        opacity: 0.8
    }).addTo(map);

    // Add selected bus marker
    busMarker = L.marker(bus.positions[0], {
        icon: busIcon
    }).addTo(map);

    busMarker.bindPopup(
        "<b>" + bus.number + "</b><br>" +
        bus.route + "<br>" +
        "Driver: " + bus.driver
    );

    // Display route area
    map.fitBounds(routeLine.getBounds(), {
        padding: [30, 30]
    });

    // Update selected bus information
    document.getElementById("selectedBusName").textContent =
        bus.number;

    document.getElementById("selectedBusRoute").textContent =
        bus.route;

    document.getElementById("driverName").textContent =
        bus.driver;

    document.getElementById("busStatus").textContent =
        bus.status;

    document.getElementById("busCapacity").textContent =
        bus.capacity;

    document.getElementById("eta").textContent =
        bus.eta + " min";

    // Update selected bus button
    document.querySelectorAll(".bus-select").forEach(button => {
        button.classList.remove("selected");
    });

    const selectedButton = document.querySelector(
        '.bus-select[data-bus="' + index + '"]'
    );

    if (selectedButton) {
        selectedButton.classList.add("selected");
    }

    // Start simulated bus movement
    movementTimer = setInterval(moveBus, 3000);

}


// 9. SIMULATE BUS MOVEMENT

function moveBus() {

    const bus = buses[currentBusIndex];

    currentPosition++;

    if (currentPosition >= bus.positions.length) {
        currentPosition = 0;
    }

    const newPosition = bus.positions[currentPosition];

    // Update marker position
    busMarker.setLatLng(newPosition);

    // Update popup
    busMarker.setPopupContent(
        "<b>" + bus.number + "</b><br>" +
        bus.route + "<br>" +
        "Driver: " + bus.driver + "<br>" +
        "Status: " + bus.status
    );

    console.log(
        bus.number + " simulated location updated:",
        newPosition
    );
}


// 10. BUS SELECTION EVENTS

document.querySelectorAll(".bus-select").forEach(button => {

    button.addEventListener("click", function () {

        const index = Number(this.dataset.bus);

        selectBus(index);

    });

});


// 11. SIDEBAR NAVIGATION

const navigationLinks = document.querySelectorAll(".nav-link");

navigationLinks.forEach(link => {

    link.addEventListener("click", function () {

        navigationLinks.forEach(item => {
            item.classList.remove("active");
        });

        this.classList.add("active");

    });

});


// 12. LOAD FIRST BUS BY DEFAULT

selectBus(0);


// 13. CONSOLE MESSAGE

console.log(
    "CampusTrack Transport Dashboard loaded successfully!"
);