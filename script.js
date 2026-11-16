
// Backend API URL
const API_URL = "http://127.0.0.1:5001/api/food-items";

// Menu data will come from the database
let menuData = [];
let cart = [];
let orders = [];

// Safe HTML display
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Load food items from Flask backend
async function loadMenu() {
    const foodGrid = document.getElementById("foodGrid");

    foodGrid.innerHTML = "<p>Loading food menu...</p>";

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Unable to fetch food items");
        }

        const data = await response.json();

        // Ignore old sample records without meal_time
        menuData = data
            .filter(item => item.available == 1)
            .map(item => ({
                id: item.id,
                name: item.name,
                price: Number(item.price),
                time: item.meal_time,
                img: item.image || "",
                description: item.description || "",
                category: item.category || "Food"
            }));

        renderMenu("All");
        updateCartUI();

        console.log("Food items loaded from database:", menuData);

    } catch (error) {
        console.error("Menu loading error:", error);
        foodGrid.innerHTML =
            "<p>Unable to load food menu. Please check whether the backend server is running.</p>";
    }
}

window.addEventListener("DOMContentLoaded", () => {
    loadMenu();
    renderOrderHistory();
});

// Filter menu by meal time
function filterMenu(timeCategory, btnElement) {

    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    if (btnElement) {
        btnElement.classList.add("active");
    }

    const titleMap = {
        Morning: "🌅 Morning Breakfast Menu",
        Afternoon: "☀️ Afternoon Lunch & Meals",
        Evening: "🌙 Evening Snacks & Beverages",
        All: "🍽️ Complete Canteen Menu"
    };

    document.getElementById("menuTitle").innerText =
        titleMap[timeCategory] || "Canteen Menu";

    renderMenu(timeCategory);
}

// Display food cards
function renderMenu(category) {

    const foodGrid = document.getElementById("foodGrid");
    foodGrid.innerHTML = "";

    const filteredItems = category === "All"
        ? menuData
        : menuData.filter(item => item.time === category);

    if (filteredItems.length === 0) {
        foodGrid.innerHTML = "<p>No food items available.</p>";
        return;
    }

    filteredItems.forEach(item => {

        const imageURL = item.img.startsWith("https://")
            ? escapeHTML(item.img)
            : "https://placehold.co/500x350?text=Food";

        const card = `
            <div class="food-card">
                <img
                    src="${imageURL}"
                    alt="${escapeHTML(item.name)}"
                    onerror="this.src='https://placehold.co/500x350?text=Food'"
                >

                <div class="food-info">
                    <span class="badge">${escapeHTML(item.time)}</span>

                    <h3>${escapeHTML(item.name)}</h3>

                    <p>${escapeHTML(item.description)}</p>

                    <p class="price">₹${item.price.toFixed(2)}</p>

                    <button
                        class="add-btn"
                        onclick="addToCart(${item.id})">
                        + Add to Cart
                    </button>
                </div>
            </div>
        `;

        foodGrid.innerHTML += card;
    });
}

// Add food item to cart
function addToCart(id) {

    const foodItem = menuData.find(item => item.id === id);

    if (!foodItem) {
        alert("Food item not found!");
        return;
    }

    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({
            ...foodItem,
            qty: 1
        });
    }

    updateCartUI();
}

// Change quantity
function changeQty(id, delta) {

    const itemIndex = cart.findIndex(item => item.id === id);

    if (itemIndex > -1) {

        cart[itemIndex].qty += delta;

        if (cart[itemIndex].qty <= 0) {
            cart.splice(itemIndex, 1);
        }
    }

    updateCartUI();
}

// Update cart display
function updateCartUI() {

    const cartContainer = document.getElementById("cartItems");
    const totalQtyEl = document.getElementById("totalQty");
    const grandTotalEl = document.getElementById("grandTotal");

    if (cart.length === 0) {

        cartContainer.innerHTML =
            '<p class="empty-msg">Your cart is empty. Add items from the menu!</p>';

        totalQtyEl.innerText = "0";
        grandTotalEl.innerText = "₹0";

        return;
    }

    cartContainer.innerHTML = "";

    let totalQty = 0;
    let grandTotal = 0;

    cart.forEach(item => {

        totalQty += item.qty;
        grandTotal += item.price * item.qty;

        cartContainer.innerHTML += `
            <div class="cart-item">

                <div>
                    <strong>${escapeHTML(item.name)}</strong>
                    <br>

                    <small>
                        ₹${item.price} x ${item.qty}
                        = ₹${item.price * item.qty}
                    </small>
                </div>

                <div class="qty-controls">

                    <button onclick="changeQty(${item.id}, -1)">-</button>

                    <span style="margin: 0 6px;">
                        ${item.qty}
                    </span>

                    <button onclick="changeQty(${item.id}, 1)">+</button>

                </div>
            </div>
        `;
    });

    totalQtyEl.innerText = totalQty;
    grandTotalEl.innerText = `₹${grandTotal.toFixed(2)}`;
}




// Place Order API - Save order in Database
async function placeOrder() {

    if (cart.length === 0) {
        alert("Please add at least one food item!");
        return;
    }

    const role = document.getElementById("userRole").value;
    const payment = document.getElementById("paymentMethod").value;

    const orderItems = cart.map(item => ({
        food_item_id: item.id,
        quantity: item.qty
    }));

    try {
        const response = await fetch("http://127.0.0.1:5001/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                role: role,
                payment_method: payment,
                items: orderItems
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Order failed");
        }

        // Reload order history from database
        await renderOrderHistory();

        cart = [];
        updateCartUI();

        alert(
            `Order Placed Successfully!\n` +
            `Token Number: ${result.token}\n` +
            `Total Amount: ₹${Number(result.total_amount).toFixed(2)}`
        );

    } catch (error) {
        console.error("Order Error:", error);
        alert("Unable to place order: " + error.message);
    }
}



// Display Order History from Database
async function renderOrderHistory() {
    const tbody = document.getElementById("orderHistoryBody");

    try {
        const response = await fetch("http://127.0.0.1:5001/api/orders");

        if (!response.ok) {
            throw new Error("Unable to load order history");
        }

        const orders = await response.json();
        tbody.innerHTML = "";

        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">No orders found</td>
                </tr>
            `;
            return;
        }

        orders.forEach(order => {
            const orderDate = order.created_at
                ? new Date(order.created_at.replace(" ", "T") + "Z")
                : null;

            const dateText = orderDate && !isNaN(orderDate)
                ? orderDate.toLocaleDateString("en-IN")
                : "Not available";

            const timeText = orderDate && !isNaN(orderDate)
                ? orderDate.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                    timeZone: "Asia/Kolkata"
                })
                : "Not available";

            tbody.innerHTML += `
                <tr>
                    <td><strong>${escapeHTML(order.token)}</strong></td>
                    <td>${escapeHTML(order.role)}</td>
                    <td>${escapeHTML(order.items || "")}</td>
                    <td><strong>₹${Number(order.total).toFixed(2)}</strong></td>
                    <td>${escapeHTML(order.payment)}</td>
                    <td>${dateText}</td>
                    <td>${timeText}</td>
                    <td>
                        <span class="status-badge">
                            ${escapeHTML(order.status)}
                        </span>
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error("Order History Error:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="8">Unable to load order history</td>
            </tr>
        `;
    }
}
