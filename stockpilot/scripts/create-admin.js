require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/database/db');
const auditService = require('../src/services/audit.service');

const args = process.argv.slice(2);

const username = args[0] || process.env.ADMIN_USERNAME || 'admin';
const email = args[1] || process.env.ADMIN_EMAIL || 'admin@stockpilot.local';
const password = args[2] || process.env.ADMIN_PASSWORD || 'Admin@12345';
const fullName = args[3] || process.env.ADMIN_FULL_NAME || 'System Administrator';

console.log('--- StockPilot Admin Account Setup ---');

if (!username || !email || !password) {
  console.error('Usage: node scripts/create-admin.js <username> <email> <password> [fullName]');
  process.exit(1);
}

try {
  const existing = db.prepare('SELECT id, username, role_id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    console.log(`User '${username}' or email '${email}' already exists (ID: ${existing.id}, Role: ${existing.role_id}).`);
    
    // If not super_admin, upgrade them
    if (existing.role_id !== 'super_admin') {
      db.prepare("UPDATE users SET role_id = 'super_admin', is_active = 1 WHERE id = ?").run(existing.id);
      console.log(`User ${existing.username} has been promoted to Super Administrator.`);
    } else {
      console.log('Account is already a Super Administrator.');
    }
    process.exit(0);
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'super_admin', 1, ?, ?)
  `);

  const result = stmt.run(username, fullName, email, passwordHash, now, now);
  const newUserId = result.lastInsertRowid;

  auditService.log({
    userId: newUserId,
    username: username,
    action: 'USER_CREATE_ADMIN_SETUP',
    targetType: 'user',
    targetId: newUserId,
    details: 'Initial admin created via secure setup CLI script',
    outcome: 'SUCCESS'
  });

  console.log(`Super Administrator created successfully!`);
  console.log(`ID: ${newUserId}`);
  console.log(`Username: ${username}`);
  console.log(`Email: ${email}`);
  console.log(`Role: super_admin`);
  console.log(`Permissions: Unrestricted system access`);
} catch (err) {
  console.error('Error creating admin account:', err.message);
  process.exit(1);
}
