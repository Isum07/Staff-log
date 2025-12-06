const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'leave_management.db');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: 'teacher-leave-management-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'leave-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only PDF, JPEG, JPG, and PNG files are allowed!'));
        }
    }
});

// Database helper function
function getDb() {
    return new sqlite3.Database(dbPath);
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login');
}

// Role-based access control middleware
function requireRole(roles) {
    return (req, res, next) => {
        if (req.session && req.session.userId && req.session.role) {
            if (roles.includes(req.session.role)) {
                return next();
            }
        }
        res.status(403).json({ error: 'Unauthorized access' });
    };
}

// Routes

// Root route
app.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Login page
app.get('/login', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login handler
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const db = getDb();
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            db.close();
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        bcrypt.compare(password, user.password, (err, match) => {
            db.close();
            if (err) {
                return res.status(500).json({ error: 'Authentication error' });
            }

            if (!match) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            // Set session
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;
            req.session.fullName = user.full_name;

            res.json({ 
                success: true, 
                role: user.role,
                message: 'Login successful'
            });
        });
    });
});

// Logout handler
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true });
    });
});

// Dashboard
app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Get current user info
app.get('/api/user', requireAuth, (req, res) => {
    res.json({
        id: req.session.userId,
        username: req.session.username,
        role: req.session.role,
        fullName: req.session.fullName
    });
});

// Get leave requests
app.get('/api/leave-requests', requireAuth, (req, res) => {
    const db = getDb();
    let query;
    let params = [];

    if (req.session.role === 'admin') {
        query = `SELECT lr.*, u.full_name, u.username 
                 FROM leave_requests lr 
                 JOIN users u ON lr.user_id = u.id 
                 ORDER BY lr.applied_at DESC`;
    } else {
        query = `SELECT lr.*, u.full_name, u.username 
                 FROM leave_requests lr 
                 JOIN users u ON lr.user_id = u.id 
                 WHERE lr.user_id = ? 
                 ORDER BY lr.applied_at DESC`;
        params = [req.session.userId];
    }

    db.all(query, params, (err, rows) => {
        db.close();
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Apply for leave
app.post('/api/leave-requests', requireAuth, upload.single('document'), (req, res) => {
    const { leave_type, start_date, end_date, reason } = req.body;

    // Validation
    if (!leave_type || !start_date || !end_date || !reason) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (leave_type !== 'medical' && leave_type !== 'casual') {
        return res.status(400).json({ error: 'Invalid leave type' });
    }

    // Medical leaves require document upload
    if (leave_type === 'medical' && !req.file) {
        return res.status(400).json({ error: 'Document upload is required for medical leave' });
    }

    // Casual leaves should not have documents
    if (leave_type === 'casual' && req.file) {
        // Delete the uploaded file if it exists
        if (req.file.path) {
            fs.unlinkSync(req.file.path);
        }
    }

    const documentPath = leave_type === 'medical' && req.file ? req.file.path : null;

    const db = getDb();
    db.run(
        `INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, reason, document_path) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.session.userId, leave_type, start_date, end_date, reason, documentPath],
        function(err) {
            db.close();
            if (err) {
                // Delete uploaded file if database insert fails
                if (req.file && req.file.path) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(500).json({ error: 'Failed to submit leave request' });
            }
            res.json({ 
                success: true, 
                id: this.lastID,
                message: 'Leave request submitted successfully' 
            });
        }
    );
});

// Approve/Reject leave request
app.post('/api/leave-requests/:id/review', requireAuth, requireRole(['admin']), (req, res) => {
    const { id } = req.params;
    const { action, comments } = req.body; // action: 'approve' or 'reject'

    if (!action || (action !== 'approve' && action !== 'reject')) {
        return res.status(400).json({ error: 'Invalid action' });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    const db = getDb();

    db.run(
        `UPDATE leave_requests 
         SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, comments = ? 
         WHERE id = ?`,
        [status, req.session.userId, comments || null, id],
        function(err) {
            db.close();
            if (err) {
                return res.status(500).json({ error: 'Failed to update leave request' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Leave request not found' });
            }
            res.json({ 
                success: true, 
                message: `Leave request ${status} successfully` 
            });
        }
    );
});

// Get leave request by ID
app.get('/api/leave-requests/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const db = getDb();

    let query;
    let params = [id];

    if (req.session.role === 'admin') {
        query = `SELECT lr.*, u.full_name, u.username 
                 FROM leave_requests lr 
                 JOIN users u ON lr.user_id = u.id 
                 WHERE lr.id = ?`;
    } else {
        query = `SELECT lr.*, u.full_name, u.username 
                 FROM leave_requests lr 
                 JOIN users u ON lr.user_id = u.id 
                 WHERE lr.id = ? AND lr.user_id = ?`;
        params.push(req.session.userId);
    }

    db.get(query, params, (err, row) => {
        db.close();
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Leave request not found' });
        }
        res.json(row);
    });
});

// Download document
app.get('/api/documents/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const db = getDb();

    db.get('SELECT document_path, user_id FROM leave_requests WHERE id = ?', [id], (err, row) => {
        db.close();
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!row || !row.document_path) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Check authorization
        if (req.session.role !== 'admin' && row.user_id !== req.session.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const filePath = path.join(__dirname, row.document_path);
        if (fs.existsSync(filePath)) {
            res.download(filePath);
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Make sure to run "npm run init-db" to initialize the database');
});

