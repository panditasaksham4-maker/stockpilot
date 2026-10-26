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
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

// Trust Render's reverse proxy for secure HTTPS cookies and remote IP detection
app.set('trust proxy', 1);

// Security & Parsing Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Warn if SESSION_SECRET is not configured in production
if (isProduction && !process.env.SESSION_SECRET) {
  console.warn('[SECURITY WARNING] SESSION_SECRET is not set in production! Please define SESSION_SECRET in your environment variables.');
}

// Secure Production Session Configuration
app.use(session({
  name: 'stockpilot.sid',
  secret: process.env.SESSION_SECRET || 'stockpilot_secure_fallback_session_key_2026',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: isProduction,
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

// Idempotent Super Administrator Provisioning (Optional bootstrap from environment)
function ensureDefaultAdmin() {
  const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role_id = 'super_admin'").get().count;
  if (adminCount === 0) {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminUsername && adminPassword) {
      const bcrypt = require('bcryptjs');
      const adminEmail = process.env.ADMIN_EMAIL || `${adminUsername}@stockpilot.local`;
      const adminFullName = process.env.ADMIN_FULL_NAME || 'System Administrator';

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(adminPassword, salt);
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'super_admin', 1, ?, ?)
      `).run(adminUsername.trim(), adminFullName.trim(), adminEmail.trim(), hash, now, now);

      console.log(`[StockPilot] Initial Super Administrator account provisioned from environment variables: username='${adminUsername.trim()}'`);
    } else {
      console.log(`[StockPilot] Notice: No Super Administrator account exists yet. Set ADMIN_USERNAME and ADMIN_PASSWORD in environment variables, or run 'npm run create-admin' to initialize.`);
    }
  }
}

ensureDefaultAdmin();

if (require.main === module) {
  const server = app.listen(PORT, HOST, () => {
    console.log(`=======================================================`);
    console.log(` StockPilot - Inventory Management System Running`);
    console.log(` Listening on: http://${HOST}:${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);
  });

  const gracefulShutdown = (signal) => {
    console.log(`\n[StockPilot] Received ${signal}. Flushing database changes and shutting down gracefully...`);
    if (typeof db.checkpoint === 'function') {
      try {
        db.checkpoint();
      } catch (err) {
        console.error('[StockPilot] Error checkpointing database on shutdown:', err.message);
      }
    }
    server.close(() => {
      console.log('[StockPilot] HTTP server closed cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

module.exports = app;
