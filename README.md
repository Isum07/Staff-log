# Teacher Leave Management System

A professional web application for managing teacher leave requests with role-based access control, document upload functionality, and approval workflow.

## Features

### User Authentication & Role Management
- Secure login system with credential verification
- Role-based access control (Teacher/Admin)
- Session management
- Automatic redirect to dashboard after login
- Error handling for invalid credentials

### Leave Application
- Leave request form with validation
- Two leave types:
  - **Medical Leave**: Requires document upload (PDF, JPG, PNG)
  - **Casual Leave**: No document required
- Date validation (end date must be after start date)
- Confirmation messages after submission

### Leave Approval System
- Admin can approve/reject leave requests
- Status tracking (Pending, Approved, Rejected)
- Comments/notes for approval decisions
- Real-time status updates

### Professional UI
- Modern, responsive design
- Clean and intuitive interface
- Professional color scheme
- Mobile-friendly layout

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Initialize Database**
   ```bash
   npm run init-db
   ```
   This will create the database and default users.

3. **Start the Server**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Access the Application**
   Open your browser and navigate to: `http://localhost:3000`

## Default Login Credentials

### Admin Account
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** Administrator (can approve/reject leaves)

### Teacher Account
- **Username:** `teacher1`
- **Password:** `teacher123`
- **Role:** Teacher (can apply for leaves)

## Project Structure

```
teacher-leave-management/
├── server.js              # Express server and routes
├── init-db.js            # Database initialization
├── package.json          # Dependencies
├── public/               # Frontend files
│   ├── login.html       # Login page
│   ├── dashboard.html   # Main dashboard
│   ├── styles.css       # Professional styling
│   └── dashboard.js     # Dashboard functionality
│   └── login.js         # Login functionality
└── uploads/             # Uploaded documents (created automatically)
```

## Database Schema

### Users Table
- `id`: Primary key
- `username`: Unique username
- `password`: Hashed password
- `role`: 'teacher' or 'admin'
- `full_name`: Full name of user
- `email`: Email address

### Leave Requests Table
- `id`: Primary key
- `user_id`: Foreign key to users
- `leave_type`: 'medical' or 'casual'
- `start_date`: Leave start date
- `end_date`: Leave end date
- `reason`: Reason for leave
- `document_path`: Path to uploaded document (medical only)
- `status`: 'pending', 'approved', or 'rejected'
- `applied_at`: Timestamp of application
- `reviewed_by`: Admin who reviewed
- `reviewed_at`: Review timestamp
- `comments`: Admin comments

## API Endpoints

- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user info
- `GET /api/leave-requests` - Get all leave requests
- `POST /api/leave-requests` - Submit new leave request
- `POST /api/leave-requests/:id/review` - Approve/reject leave (admin only)
- `GET /api/leave-requests/:id` - Get specific leave request
- `GET /api/documents/:id` - Download document

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- Role-based access control middleware
- File upload validation (type and size)
- SQL injection protection (parameterized queries)

## Technologies Used

- **Backend:** Node.js, Express.js
- **Database:** SQLite3
- **Authentication:** Express-session, bcryptjs
- **File Upload:** Multer
- **Frontend:** HTML5, CSS3, Vanilla JavaScript

## Notes

- Documents are stored in the `uploads/` directory
- Maximum file size: 5MB
- Supported file types: PDF, JPG, JPEG, PNG
- Database file: `leave_management.db` (created automatically)

## License

ISC

