
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import secrets
import os
from pathlib import Path

app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parents[3]
DB_PATH = BASE_DIR / "canteen.db"


# Database Connection
def get_db_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection

        
# Initialize Database
def initialize_database():

    connection = get_db_connection()

    try:
        # Student Table
        connection.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Admin Table
        connection.execute("""
            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

                # Create or Update Admin Account
        admin_username = os.environ.get("NEXORA_ADMIN_USERNAME")
        admin_password = os.environ.get("NEXORA_ADMIN_PASSWORD")

        if admin_username and admin_password:
            hashed_password = generate_password_hash(admin_password)

            connection.execute("""
                INSERT INTO admins (username, password)
                VALUES (?, ?)
                ON CONFLICT(username)
                DO UPDATE SET password = excluded.password
            """, (admin_username, hashed_password))

        connection.commit()
    finally:
        connection.close()

# Home API
@app.route("/")
def home():
    return jsonify({
        "message": "Smart Canteen Backend is Running!",
        "status": "Success"
    })


# Health API
@app.route("/api/health")
def health():
    return jsonify({
        "status": "Healthy",
        "project": "Smart Canteen Management System"
    })


# Get Food Items API
@app.route("/api/food-items", methods=["GET"])
def get_food_items():

    connection = get_db_connection()

    try:
        foods = connection.execute(
            "SELECT * FROM food_items WHERE available = 1"
        ).fetchall()

        return jsonify([dict(food) for food in foods])

    finally:
        connection.close()


# Add Food Item API
@app.route("/api/food-items", methods=["POST"])
def add_food_item():

    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    description = str(data.get("description", "")).strip()
    category = str(data.get("category", "")).strip()
    meal_time = str(data.get("meal_time", "")).strip()
    image = str(data.get("image", "")).strip()

    try:
        price = float(data.get("price", 0))
    except (ValueError, TypeError):
        return jsonify({
            "status": "Error",
            "message": "Invalid price"
        }), 400

    if not name or not category or not meal_time or price <= 0:
        return jsonify({
            "status": "Error",
            "message": "Please provide valid food details"
        }), 400

    connection = get_db_connection()

    try:
        cursor = connection.execute("""
            INSERT INTO food_items
            (name, description, price, category, image, available, meal_time)
            VALUES (?, ?, ?, ?, ?, 1, ?)
        """, (name, description, price, category, image, meal_time))

        connection.commit()

        return jsonify({
            "status": "Success",
            "message": "Food item added successfully",
            "id": cursor.lastrowid
        }), 201

    finally:
        connection.close()


# Delete Food Item API
@app.route("/api/food-items/<int:food_id>", methods=["DELETE"])
def delete_food_item(food_id):

    connection = get_db_connection()

    try:
        cursor = connection.execute("""
            UPDATE food_items
            SET available = 0
            WHERE id = ? AND available = 1
        """, (food_id,))

        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({
                "status": "Error",
                "message": "Food item not found"
            }), 404

        return jsonify({
            "status": "Success",
            "message": "Food item deleted successfully"
        })

    finally:
        connection.close()


# Student Registration API
@app.route("/api/student/register", methods=["POST"])
def student_register():

    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")

    if not isinstance(password, str):
        password = ""

    if not name or not email or not password:
        return jsonify({
            "status": "Error",
            "message": "All fields are required"
        }), 400

    if "@" not in email:
        return jsonify({
            "status": "Error",
            "message": "Invalid email address"
        }), 400

    if len(password) < 8:
        return jsonify({
            "status": "Error",
            "message": "Password must contain at least 8 characters"
        }), 400

    hashed_password = generate_password_hash(password)

    connection = get_db_connection()

    try:
        connection.execute("""
            INSERT INTO students (name, email, password)
            VALUES (?, ?, ?)
        """, (name, email, hashed_password))

        connection.commit()

        return jsonify({
            "status": "Success",
            "message": "Student registered successfully"
        }), 201

    except sqlite3.IntegrityError:
        return jsonify({
            "status": "Error",
            "message": "Email already registered"
        }), 409

    finally:
        connection.close()


# Student Login API
@app.route("/api/student/login", methods=["POST"])
def student_login():

    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")

    if not isinstance(password, str):
        password = ""

    if not email or not password:
        return jsonify({
            "status": "Error",
            "message": "Email and password are required"
        }), 400

    connection = get_db_connection()

    try:
        student = connection.execute("""
            SELECT * FROM students WHERE email = ?
        """, (email,)).fetchone()

    finally:
        connection.close()

    if student is None or not check_password_hash(
        student["password"], password
    ):
        return jsonify({
            "status": "Error",
            "message": "Invalid email or password"
        }), 401

    return jsonify({
        "status": "Success",
        "message": "Student login successful",
        "student": {
            "id": student["id"],
            "name": student["name"],
            "email": student["email"]
        }
    }), 200

# Admin Login API
@app.route("/api/admin/login", methods=["POST"])
def admin_login():

    data = request.get_json(silent=True) or {}

    username = str(data.get("username", "")).strip()
    password = data.get("password", "")

    if not isinstance(password, str):
        password = ""

    if not username or not password:
        return jsonify({
            "status": "Error",
            "message": "Username and password are required"
        }), 400

    connection = get_db_connection()

    try:
        admin = connection.execute("""
            SELECT * FROM admins WHERE username = ?
        """, (username,)).fetchone()

    finally:
        connection.close()

    if admin is None or not check_password_hash(
        admin["password"], password
    ):
        return jsonify({
            "status": "Error",
            "message": "Invalid admin username or password"
        }), 401

    return jsonify({
        "status": "Success",
        "message": "Admin login successful",
        "admin": {
            "id": admin["id"],
            "username": admin["username"]
        }
    }), 200



# Place Order API
@app.route("/api/orders", methods=["POST"])
def place_order():

    data = request.get_json(silent=True) or {}

    role = str(data.get("role", "")).strip()
    payment_method = str(data.get("payment_method", "")).strip()
    items = data.get("items", [])

    if role not in ["Student", "Staff"]:
        return jsonify({
            "status": "Error",
            "message": "Invalid role"
        }), 400

    if payment_method not in ["Cash", "UPI"]:
        return jsonify({
            "status": "Error",
            "message": "Invalid payment method"
        }), 400

    if not isinstance(items, list) or not items:
        return jsonify({
            "status": "Error",
            "message": "Cart is empty"
        }), 400

    connection = get_db_connection()

    try:
        total_amount = 0
        order_items = []

        for item in items:

            if not isinstance(item, dict):
                return jsonify({
                    "status": "Error",
                    "message": "Invalid order item"
                }), 400

            food_id = item.get("food_item_id")
            quantity = item.get("quantity")

            if (
                isinstance(food_id, bool)
                or not isinstance(food_id, int)
                or isinstance(quantity, bool)
                or not isinstance(quantity, int)
                or quantity <= 0
            ):
                return jsonify({
                    "status": "Error",
                    "message": "Invalid food item or quantity"
                }), 400

            food = connection.execute("""
                SELECT id, name, price
                FROM food_items
                WHERE id = ? AND available = 1
            """, (food_id,)).fetchone()

            if food is None:
                return jsonify({
                    "status": "Error",
                    "message": "Food item not available"
                }), 400

            subtotal = float(food["price"]) * quantity
            total_amount += subtotal

            order_items.append({
                "food_id": food["id"],
                "name": food["name"],
                "quantity": quantity,
                "price": float(food["price"]),
                "subtotal": subtotal
            })

        token = "TKN-" + str(secrets.randbelow(9000) + 1000)

        cursor = connection.execute("""
            INSERT INTO orders
            (token, role, total_amount, payment_method,
             payment_status, order_status)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            token,
            role,
            total_amount,
            payment_method,
            "Pending",
            "Preparing"
        ))

        order_id = cursor.lastrowid

        for item in order_items:

            connection.execute("""
                INSERT INTO order_items
                (order_id, food_item_id, food_name,
                 quantity, unit_price, subtotal)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                order_id,
                item["food_id"],
                item["name"],
                item["quantity"],
                item["price"],
                item["subtotal"]
            ))

        connection.commit()

        return jsonify({
            "status": "Success",
            "message": "Order placed successfully",
            "order_id": order_id,
            "token": token,
            "total_amount": total_amount
        }), 201

    except Exception as error:

        connection.rollback()
        print("Order Error:", error)

        return jsonify({
            "status": "Error",
            "message": "Unable to place order"
        }), 500

    finally:
        connection.close()
# Get Order History API
@app.route("/api/orders", methods=["GET"])
def get_orders():

    connection = get_db_connection()

    try:
        rows = connection.execute("""
            SELECT
                o.id,
                o.token,
                o.role,
                o.total_amount,
                o.payment_method,
                o.payment_status,
                o.order_status,
                o.created_at,
                GROUP_CONCAT(
                    oi.food_name || ' (x' || oi.quantity || ')',
                    ', '
                ) AS items
            FROM orders o
            LEFT JOIN order_items oi
                ON o.id = oi.order_id
            GROUP BY o.id
            ORDER BY o.id DESC
        """).fetchall()

        return jsonify([
            {
                "id": row["id"],
                "token": row["token"],
                "role": row["role"],
                "items": row["items"],
                "total": row["total_amount"],
                "payment": row["payment_method"],
                "status": row["order_status"],
                "created_at": row["created_at"]
            }
            for row in rows
        ])

    finally:
        connection.close()

# UPDATE ORDER STATUS API
@app.route("/api/orders/<int:order_id>/status", methods=["PUT"])
def update_order_status(order_id):

    data = request.get_json(silent=True) or {}

    status = str(data.get("status", "")).strip()

    allowed_statuses = ["Preparing", "Ready", "Completed"]

    if status not in allowed_statuses:
        return jsonify({
            "message": "Invalid order status"
        }), 400

    connection = sqlite3.connect(DB_PATH)

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            UPDATE orders
            SET order_status = ?
            WHERE id = ?
            """,
            (status, order_id)
        )

        if cursor.rowcount == 0:
            connection.rollback()

            return jsonify({
                "message": "Order not found"
            }), 404

        connection.commit()

        return jsonify({
            "message": "Order status updated successfully",
            "order_id": order_id,
            "status": status
        }), 200

    except Exception as error:

        connection.rollback()

        return jsonify({
            "message": str(error)
        }), 500

    finally:
        connection.close()


	
# Run Flask Application
if __name__ == "__main__":

    initialize_database()

    app.run(debug=True, port=5001)
