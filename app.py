import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
# --- Configuration ---
DB_NAME = 'creds.db'
# --- Flask App Initialization ---
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend-backend communication
# --- Utility Functions ---
def get_db_connection():
    """Connect to the SQLite database."""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn
def init_db():
    """Create the users table without email field."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            country TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()
    print(f"Database '{DB_NAME}' initialized with 'users' table (no email).")
def register_user(name, username, password, country):
    """Register a new user with hashed password and country."""
    if not (name and username and password and country):
        return "All fields are required."
    password_hash = generate_password_hash(password)
    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT INTO users (name, username, password_hash, country) VALUES (?, ?, ?, ?)",
            (name, username, password_hash, country)
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError as e:
        if 'username' in str(e):
            return "Username already exists."
        else:
            return f"Database error: {e}"
    finally:
        conn.close()
def authenticate_user(username, password, country):
    """Authenticate user by username, password, and country."""
    conn = get_db_connection()
    user = conn.execute(
        'SELECT * FROM users WHERE username = ?',
        (username,)
    ).fetchone()
    conn.close()
    if user and check_password_hash(user['password_hash'], password) and user['country'] == country:
        return {
            'id': user['id'],
            'name': user['name'],
            'username': user['username'],
            'country': user['country']
        }
    return None
# --- API Endpoints ---
@app.route('/api/register', methods=['POST'])
def api_register():
    """API endpoint to register a new user."""
    data = request.get_json()
    name = data.get('name')
    username = data.get('username')
    password = data.get('password')
    country = data.get('country')
    result = register_user(name, username, password, country)
    if result is True:
        return jsonify({'success': True, 'message': 'Registration successful'}), 201
    else:
        return jsonify({'success': False, 'message': result}), 400
@app.route('/api/login', methods=['POST'])
def api_login():
    """API endpoint to authenticate a user."""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    country = data.get('country')
    if not username or not password or not country:
        return jsonify({'success': False, 'message': 'Missing username, password, or country'}), 400
    user_data = authenticate_user(username, password, country)
    if user_data:
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': user_data
        }), 200
    else:
        return jsonify({'success': False, 'message': 'Invalid credentials or country'}), 401
if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
 

