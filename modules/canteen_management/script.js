 // Food Menu Data with exactly 10 items for Morning, Afternoon, and Evening
const menuData = [
    // --- Morning Items (10 Items) ---
    { id: 1, name: "Idli Sambar (2 Pcs)", price: 30, time: "Morning", img: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400" },
    { id: 2, name: "Masala Dosa", price: 45, time: "Morning", img: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400" },
    { id: 3, name: "Ven Pongal & Vada", price: 40, time: "Morning", img: "https://images.unsplash.com/photo-1630383249896-424e482df921?w=400" },
    { id: 4, name: "Poori Masala", price: 40, time: "Morning", img: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=400" },
    { id: 5, name: "Ghee Roast Dosa", price: 60, time: "Morning", img: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400" },
    { id: 6, name: "Vada (2 Pcs)", price: 20, time: "Morning", img: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400" },
    { id: 7, name: "Upma / Kichadi", price: 25, time: "Morning", img: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400" },
    { id: 8, name: "Bread Toast & Jam", price: 25, time: "Morning", img: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400" },
    { id: 9, name: "Filter Coffee", price: 15, time: "Morning", img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400" },
    { id: 10, name: "Hot Milk / Tea", price: 15, time: "Morning", img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400" },

    // --- Afternoon Items (10 Items) ---
    { id: 11, name: "Full South Indian Meals", price: 70, time: "Afternoon", img: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400" },
    { id: 12, name: "Veg Fried Rice", price: 65, time: "Afternoon", img: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400" },
    { id: 13, name: "Chicken Fried Rice", price: 90, time: "Afternoon", img: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400" },
    { id: 14, name: "Chicken Biryani", price: 110, time: "Afternoon", img: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400" },
    { id: 15, name: "Chapati & Kurma", price: 50, time: "Afternoon", img: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400" },
    { id: 16, name: "Lemon Rice", price: 40, time: "Afternoon", img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400" },
    { id: 17, name: "Curd Rice", price: 35, time: "Afternoon", img: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400" },
    { id: 18, name: "Veg Noodles", price: 60, time: "Afternoon", img: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400" },
    { id: 19, name: "Egg Rice", price: 75, time: "Afternoon", img: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400" },
    { id: 20, name: "Parotta with Salna (2 Pcs)", price: 55, time: "Afternoon", img: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400" },

    // --- Evening Items (10 Items) ---
    { id: 21, name: "Crispy Samosa (2 Pcs)", price: 20, time: "Evening", img: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400" },
    { id: 22, name: "Egg / Veg Puff", price: 25, time: "Evening", img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400" },
    { id: 23, name: "Veg Hakka Noodles", price: 60, time: "Evening", img: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400" },
    { id: 24, name: "Bread Omelette", price: 35, time: "Evening", img: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400" },
    { id: 25, name: "French Fries", price: 50, time: "Evening", img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400" },
    { id: 26, name: "Mirchi Bajji (3 Pcs)", price: 25, time: "Evening", img: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400" },
    { id: 27, name: "Pani Puri", price: 30, time: "Evening", img: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400" },
    { id: 28, name: "Veg Burger", price: 60, time: "Evening", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400" },
    { id: 29, name: "Cold Coffee", price: 40, time: "Evening", img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400" },
    { id: 30, name: "Fresh Lime Juice", price: 20, time: "Evening", img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400" }
];

let cart = [];
let orders = [];

// Load Morning menu by default
window.onload = () => {
    renderMenu("Morning");
};

// Filter Menu by Time
function filterMenu(timeCategory, btnElement) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    const titleMap = {
        "Morning": "🌅 Morning Breakfast Menu",
        "Afternoon": "☀️ Afternoon Lunch & Meals",
        "Evening": "🌙 Evening Snacks & Beverages",
        "All": "🍽️ Complete Canteen Menu"
    };
    document.getElementById('menuTitle').innerText = titleMap[timeCategory];

    renderMenu(timeCategory);
}

// Render Food Cards
function renderMenu(category) {
    const foodGrid = document.getElementById('foodGrid');
    foodGrid.innerHTML = "";

    const filteredItems = category === "All" 
        ? menuData 
        : menuData.filter(item => item.time === category);

    filteredItems.forEach(item => {
        const card = `
            <div class="food-card">
                <img src="${item.img}" alt="${item.name}">
                <div class="food-info">
                    <span class="badge">${item.time}</span>
                    <h3>${item.name}</h3>
                    <p class="price">₹${item.price}</p>
                    <button class="add-btn" onclick="addToCart(${item.id})">+ Add to Cart</button>
                </div>
            </div>
        `;
        foodGrid.innerHTML += card;
    });
}

// Add Item to Cart
function addToCart(id) {
    const foodItem = menuData.find(item => item.id === id);
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ ...foodItem, qty: 1 });
    }
    updateCartUI();
}

// Change Quantity in Cart
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

// Update Cart Display
function updateCartUI() {
    const cartContainer = document.getElementById('cartItems');
    const totalQtyEl = document.getElementById('totalQty');
    const grandTotalEl = document.getElementById('grandTotal');

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="empty-msg">Your cart is empty. Add items from the menu!</p>';
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
                    <strong>${item.name}</strong><br>
                    <small>₹${item.price} x ${item.qty} = ₹${item.price * item.qty}</small>
                </div>
                <div class="qty-controls">
                    <button onclick="changeQty(${item.id}, -1)">-</button>
                    <span style="margin: 0 6px;">${item.qty}</span>
                    <button onclick="changeQty(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
    });

    totalQtyEl.innerText = totalQty;
    grandTotalEl.innerText = `₹${grandTotal}`;
}

// Place Order
function placeOrder() {
    if (cart.length === 0) {
        alert("Please add at least one food item to place an order!");
        return;
    }

    const role = document.getElementById('userRole').value;
    const payment = document.getElementById('paymentMethod').value;
    const token = "TKN-" + Math.floor(1000 + Math.random() * 9000);
    
    const itemsSummary = cart.map(i => `${i.name} (x${i.qty})`).join(", ");
    const totalAmount = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

    const newOrder = {
        token: token,
        role: role,
        items: itemsSummary,
        total: totalAmount,
        payment: payment,
        status: "Preparing"
    };

    orders.unshift(newOrder);
    renderOrderHistory();

    cart = [];
    updateCartUI();

    alert(`🎉 Order Placed Successfully!\nYour Token Number: ${token}\nRole: ${role}`);
}

// Render Order History Table
function renderOrderHistory() {
    const tbody = document.getElementById('orderHistoryBody');
    tbody.innerHTML = "";

    orders.forEach(order => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${order.token}</strong></td>
                <td>${order.role}</td>
                <td>${order.items}</td>
                <td><strong>₹${order.total}</strong></td>
                <td>${order.payment}</td>
                <td><span class="status-badge">${order.status}</span></td>
            </tr>
        `;
    });
}