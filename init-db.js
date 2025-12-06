const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'leave_management.db');

// Create database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to SQLite database.');
});

// Create tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('teacher', 'admin')),
        full_name TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Leave requests table
    db.run(`CREATE TABLE IF NOT EXISTS leave_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        leave_type TEXT NOT NULL CHECK(leave_type IN ('medical', 'casual')),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT NOT NULL,
        document_path TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_by INTEGER,
        reviewed_at DATETIME,
        comments TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
    )`);

    // Create uploads directory
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Insert default admin user (password: admin123)
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password, role, full_name, email) 
            VALUES (?, ?, ?, ?, ?)`,
        ['admin', adminPassword, 'admin', 'Administrator', 'admin@school.com'],
        function(err) {
            if (err) {
                console.error('Error creating admin user:', err.message);
            } else {
                console.log('Default admin user created (username: admin, password: admin123)');
            }
        }
    );

    // Insert sample teacher user (password: teacher123)
    const teacherPassword = bcrypt.hashSync('teacher123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password, role, full_name, email) 
            VALUES (?, ?, ?, ?, ?)`,
        ['teacher1', teacherPassword, 'teacher', 'John Doe', 'teacher1@school.com'],
        function(err) {
            if (err) {
                console.error('Error creating teacher user:', err.message);
            } else {
                console.log('Sample teacher user created (username: teacher1, password: teacher123)');
            }
        }
    );

    console.log('Database initialized successfully!');
    console.log('\nDefault Login Credentials:');
    console.log('Admin - Username: admin, Password: admin123');
    console.log('Teacher - Username: teacher1, Password: teacher123');
});

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err.message);
    } else {
        console.log('Database connection closed.');
    }
});

