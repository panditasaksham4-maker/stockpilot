require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const cors = require('cors');

// Ensure database initialization
const db = require('./database/db');

// Route Handlers
const authRoutes = require('./routes/auth.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const usersRoutes = require('./routes/users.routes');
const auditRoutes = require('./routes/audit.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Parsing Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
  name: 'stockpilot.sid',
  secret: process.env.SESSION_SECRET || 'stockpilot_secure_fallback_session_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: parseInt(process.env.SESSION_MAX_AGE_MS, 10) || (24 * 60 * 60 * 1000) // 24 hours
  }
}));

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, '../public')));

// Root Route: Redirect to dashboard or login
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    res.redirect('/dashboard.html');
  } else {
    res.redirect('/login.html');
  }
});

// Direct ZIP download endpoint
app.get('/download', (req, res) => {
  const zipPath = path.join(__dirname, '../public/StockPilot_Inventory_System.zip');
  res.download(zipPath, 'StockPilot_Inventory_System.zip');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit', auditRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'StockPilot Inventory Management System',
    timestamp: new Date().toISOString()
  });
});

// 404 Handler for undefined API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.url} not found.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Automatic Initial Admin Check on startup
function ensureDefaultAdmin() {
  const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role_id = 'super_admin'").get().count;
  if (adminCount === 0) {
    const bcrypt = require('bcryptjs');
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@stockpilot.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
    const adminFullName = process.env.ADMIN_FULL_NAME || 'System Administrator';

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(adminPassword, salt);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'super_admin', 1, ?, ?)
    `).run(adminUsername, adminFullName, adminEmail, hash, now, now);

    console.log(`[StockPilot] Initial Super Administrator account created: username='${adminUsername}'`);
  }
}

ensureDefaultAdmin();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` StockPilot - Inventory Management System Running`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
