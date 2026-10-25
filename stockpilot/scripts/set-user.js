require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/database/db');
const auditService = require('../src/services/audit.service');

const args = process.argv.slice(2);
const username = args[0];
const password = args[1];
const role = args[2] || 'super_admin';
const fullName = args[3] || 'Administrator';
const email = args[4] || `${username || 'user'}@stockpilot.local`;

console.log('=======================================================');
console.log(' StockPilot - Custom User & Password Provisioner');
console.log('=======================================================');

if (!username || !password) {
  console.log('\nUsage:');
  console.log('  node scripts/set-user.js <username> <password> [role] [fullName] [email]');
  console.log('\nExamples:');
  console.log('  node scripts/set-user.js saksh MyPassword123 super_admin');
  console.log('  node scripts/set-user.js alex SecretPass456 inventory_manager\n');
  process.exit(1);
}

if (username.length < 3) {
  console.error('Error: Username must be at least 3 characters long.');
  process.exit(1);
}

if (password.length < 6) {
  console.error('Error: Password must be at least 6 characters long.');
  process.exit(1);
}

try {
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id, username, role_id FROM users WHERE username = ? COLLATE NOCASE').get(username);

  if (existing) {
    // Update existing user's password and ensure active
    db.prepare(`
      UPDATE users 
      SET password_hash = ?, is_active = 1, updated_at = ?
      WHERE id = ?
    `).run(passwordHash, now, existing.id);

    auditService.log({
      userId: existing.id,
      username: existing.username,
      action: 'USER_PASSWORD_RESET_CLI',
      targetType: 'user',
      targetId: existing.id,
      details: 'Password updated via CLI provisioner',
      outcome: 'SUCCESS'
    });

    console.log(`\nSuccess: Existing account "${existing.username}" updated!`);
    console.log(`  User ID:    ${existing.id}`);
    console.log(`  Username:   ${existing.username}`);
    console.log(`  Role:       ${existing.role_id}`);
    console.log(`  New Pass:   ${password}`);
  } else {
    // Create new account
    const stmt = db.prepare(`
      INSERT INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `);

    const result = stmt.run(username, fullName, email, passwordHash, role, now, now);
    const newId = result.lastInsertRowid;

    auditService.log({
      userId: newId,
      username,
      action: 'USER_CREATE_CLI',
      targetType: 'user',
      targetId: newId,
      details: `Account created via CLI with role ${role}`,
      outcome: 'SUCCESS'
    });

    console.log(`\nSuccess: New account "${username}" created!`);
    console.log(`  User ID:    ${newId}`);
    console.log(`  Username:   ${username}`);
    console.log(`  Role:       ${role}`);
    console.log(`  Password:   ${password}`);
    console.log(`  Email:      ${email}`);
  }

  console.log('\nYou can now log in immediately at: http://localhost:3000/login.html\n');
} catch (err) {
  console.error('Error setting user credentials:', err.message);
  process.exit(1);
}
