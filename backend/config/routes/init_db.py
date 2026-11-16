
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[3]
DB_PATH = BASE_DIR / "canteen.db"

# 30 food items from the existing frontend menu
FOODS = [
    # Morning
    (1, "Idli Sambar (2 Pcs)", 30, "South Indian", "Morning",
     "Soft idli served with sambar",
     "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500"),

    (2, "Masala Dosa", 45, "South Indian", "Morning",
     "Crispy dosa with potato masala",
     "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500"),

    (3, "Ven Pongal", 40, "South Indian", "Morning",
     "Traditional rice and lentil pongal",
     "https://images.unsplash.com/photo-1630383249896-424e482df921?w=500"),

    (4, "Poori Masala", 40, "South Indian", "Morning",
     "Poori served with potato masala",
     "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500"),

    (5, "Medu Vada (2 Pcs)", 20, "South Indian", "Morning",
     "Crispy lentil fritters",
     "https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=500"),

    (6, "Aloo Paratha", 45, "North Indian", "Morning",
     "Paratha stuffed with spiced potato",
     "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=500"),

    (7, "Pancakes & Honey", 55, "Breakfast", "Morning",
     "Soft pancakes served with honey",
     "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500"),

    (8, "Bread Toast & Egg", 35, "Breakfast", "Morning",
     "Toasted bread served with egg",
     "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500"),

    (9, "Filter Coffee", 15, "Beverages", "Morning",
     "Traditional South Indian filter coffee",
     "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500"),

    (10, "Masala Chai (Tea)", 15, "Beverages", "Morning",
     "Hot tea with aromatic spices",
     "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500"),

    # Afternoon
    (11, "Full South Indian Meals", 70, "Meals", "Afternoon",
     "Traditional South Indian lunch meal",
     "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500"),

    (12, "Veg Fried Rice", 65, "Rice", "Afternoon",
     "Fried rice with fresh vegetables",
     "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500"),

    (13, "Chicken Biryani", 110, "Rice", "Afternoon",
     "Flavourful chicken biryani",
     "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500"),

    (14, "Chapati & Kurma", 50, "North Indian", "Afternoon",
     "Chapati served with vegetable kurma",
     "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500"),

    (15, "Paneer Butter Masala", 95, "North Indian", "Afternoon",
     "Paneer cooked in creamy tomato gravy",
     "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500"),

    (16, "Lemon Rice", 40, "Rice", "Afternoon",
     "South Indian lemon-flavoured rice",
     "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500"),

    (17, "Veg Pulao", 60, "Rice", "Afternoon",
     "Aromatic rice cooked with vegetables",
     "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=500"),

    (18, "Hakka Noodles", 60, "Noodles", "Afternoon",
     "Stir-fried noodles with vegetables",
     "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500"),

    (19, "Tandoori Chicken", 120, "Non-Veg", "Afternoon",
     "Chicken roasted with tandoori spices",
     "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500"),

    (20, "Garlic Naan & Gravy", 65, "North Indian", "Afternoon",
     "Garlic naan served with gravy",
     "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=500"),

    # Evening
    (21, "Crispy Samosa (2 Pcs)", 20, "Snacks", "Evening",
     "Crispy pastry filled with spiced potato",
     "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500"),

    (22, "Bakery Puff", 25, "Snacks", "Evening",
     "Freshly baked savoury puff",
     "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=500"),

    (23, "French Fries", 50, "Fast Food", "Evening",
     "Crispy golden potato fries",
     "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500"),

    (24, "Veg Burger", 60, "Fast Food", "Evening",
     "Fresh vegetable burger",
     "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500"),

    (25, "Club Sandwich", 45, "Fast Food", "Evening",
     "Fresh vegetable club sandwich",
     "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500"),

    (26, "Pani Puri", 30, "Snacks", "Evening",
     "Crispy puri filled with flavoured water",
     "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500"),

    (27, "Chicken Popcorn", 80, "Non-Veg", "Evening",
     "Crispy bite-sized chicken pieces",
     "https://images.unsplash.com/photo-1562967914-608f82629710?w=500"),

    (28, "Momos (6 Pcs)", 55, "Fast Food", "Evening",
     "Steamed dumplings served with sauce",
     "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=500"),

    (29, "Cold Coffee", 40, "Beverages", "Evening",
     "Chilled coffee beverage",
     "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500"),

    (30, "Fresh Lime Juice", 20, "Beverages", "Evening",
     "Refreshing fresh lime juice",
     "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500")
]


def initialize_database():

    connection = sqlite3.connect(DB_PATH)
    connection.execute("PRAGMA foreign_keys = ON")

    try:

        # Create food_items table
        connection.execute("""
            CREATE TABLE IF NOT EXISTS food_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                category TEXT,
                image TEXT,
                available INTEGER DEFAULT 1
            )
        """)

        # Check existing columns
        columns = [
            row[1] for row in
            connection.execute("PRAGMA table_info(food_items)").fetchall()
        ]

        # Add meal_time column if missing
        if "meal_time" not in columns:
            connection.execute(
                "ALTER TABLE food_items ADD COLUMN meal_time TEXT"
            )

        # Create orders table
        connection.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT NOT NULL UNIQUE,
                role TEXT NOT NULL,
                total_amount REAL NOT NULL,
                payment_method TEXT NOT NULL,
                payment_status TEXT NOT NULL DEFAULT 'Pending',
                order_status TEXT NOT NULL DEFAULT 'Placed',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create order_items table
        connection.execute("""
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                food_item_id INTEGER NOT NULL,
                food_name TEXT NOT NULL,
                quantity INTEGER NOT NULL CHECK (quantity > 0),
                unit_price REAL NOT NULL,
                subtotal REAL NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (food_item_id) REFERENCES food_items(id)
            )
        """)

        print("Orders tables created successfully!")

        # Insert new food items or update existing ones
        for food_id, name, price, category, meal_time, description, image in FOODS:

            existing = connection.execute(
                "SELECT id FROM food_items WHERE name = ? LIMIT 1",
                (name,)
            ).fetchone()

            if existing:

                connection.execute("""
                    UPDATE food_items
                    SET description = ?,
                        price = ?,
                        category = ?,
                        image = ?,
                        meal_time = ?
                    WHERE id = ?
                """, (
                    description,
                    price,
                    category,
                    image,
                    meal_time,
                    existing[0]
                ))

            else:

                connection.execute("""
                    INSERT INTO food_items
                    (name, description, price, category, image, available, meal_time)
                    VALUES (?, ?, ?, ?, ?, 1, ?)
                """, (
                    name,
                    description,
                    price,
                    category,
                    image,
                    meal_time
                ))

        connection.commit()

        print("Database updated successfully!")
        print("30 frontend food items processed successfully!")

        total = connection.execute(
            "SELECT COUNT(*) FROM food_items WHERE meal_time IS NOT NULL"
        ).fetchone()[0]

        print(f"Food items with meal time: {total}")
        print(f"Database location: {DB_PATH}")

        # Verify table creation
        tables = connection.execute("""
            SELECT name FROM sqlite_master
            WHERE type = 'table'
            AND name IN ('food_items', 'orders', 'order_items')
        """).fetchall()

        print("Verified tables:")
        for table in tables:
            print("-", table[0])

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


if __name__ == "__main__":
    initialize_database()
