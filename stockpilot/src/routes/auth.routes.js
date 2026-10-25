const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const authenticate = require('../middleware/authenticate');
const auditService = require('../services/audit.service');
const permissionsService = require('../services/permissions.service');

// In-memory rate limiting for brute-force protection
const failedAttemptsMap = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(key) {
  const record = failedAttemptsMap.get(key);
  if (!record) return { locked: false };

  const now = Date.now();
  if (now - record.firstAttempt > LOCKOUT_WINDOW_MS) {
    failedAttemptsMap.delete(key);
    return { locked: false };
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    const minutesRemaining = Math.ceil((LOCKOUT_WINDOW_MS - (now - record.firstAttempt)) / 60000);
    return { locked: true, minutesRemaining };
  }

  return { locked: false };
}

function recordFailedAttempt(key) {
  const now = Date.now();
  const record = failedAttemptsMap.get(key);
  if (!record || (now - record.firstAttempt > LOCKOUT_WINDOW_MS)) {
    failedAttemptsMap.set(key, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
}

function clearFailedAttempts(key) {
  failedAttemptsMap.delete(key);
}

/**
 * POST /api/auth/register
 * Allow any teammate to register their own account with custom username and password
 */
router.post('/register', (req, res) => {
  try {
    const { username, fullName, email, password, role = 'inventory_manager' } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    }

    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Security & RBAC: Self-registered users are assigned the base 'viewer' role by default.
    // An administrator will assign them elevated roles (e.g. inventory_manager) from User Management.
    const assignedRole = 'viewer';

    const duplicate = db.prepare('SELECT id, username, email FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE').get(username.trim(), email.trim());
    if (duplicate) {
      if (duplicate.username.toLowerCase() === username.trim().toLowerCase()) {
        return res.status(400).json({ error: 'Username is already taken. Please pick another username.' });
      }
      return res.status(400).json({ error: 'Email address is already registered.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO users (username, full_name, email, password_hash, role_id, is_active, created_at, updated_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
    `);

    const result = stmt.run(username.trim(), fullName.trim(), email.trim(), passwordHash, assignedRole, now, now, now);
    const newUserId = result.lastInsertRowid;

    auditService.log({
      userId: newUserId,
      username: username.trim(),
      action: 'AUTH_REGISTER_SUCCESS',
      targetType: 'user',
      targetId: newUserId,
      details: { role: assignedRole },
      ipAddress: clientIp,
      outcome: 'SUCCESS'
    });

    // Auto-login new user by initializing session
    req.session.regenerate((err) => {
      if (err) {
        return res.status(201).json({ message: 'Account created! Please log in.' });
      }

      req.session.userId = newUserId;
      const effectivePermissions = permissionsService.getUserEffectivePermissions(newUserId);

      return res.status(201).json({
        message: 'Account created successfully! Welcome to StockPilot.',
        user: {
          id: newUserId,
          username: username.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          role: assignedRole
        },
        permissions: effectivePermissions
      });
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    return res.status(500).json({ error: 'Internal server registration error.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user, verify password hash, initialize secure session
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const rateLimitKey = `${username.toLowerCase()}_${clientIp}`;
  const rateLimitStatus = checkRateLimit(rateLimitKey);
  if (rateLimitStatus.locked) {
    auditService.log({
      username: username.trim(),
      action: 'AUTH_RATE_LIMIT_BLOCKED',
      targetType: 'auth',
      details: `Account temporarily locked due to excessive failed attempts. Window: ${rateLimitStatus.minutesRemaining} min remaining.`,
      ipAddress: clientIp,
      outcome: 'DENIED'
    });
    return res.status(429).json({
      error: `Too many failed login attempts. Access is temporarily restricted for this account/IP. Try again in ${rateLimitStatus.minutesRemaining} minute(s).`
    });
  }

  try {
    const user = db.prepare(`
      SELECT id, username, full_name, email, password_hash, role_id, is_active
      FROM users
      WHERE username = ?
    `).get(username.trim());

    if (!user) {
      recordFailedAttempt(rateLimitKey);
      auditService.log({
        username: username.trim(),
        action: 'AUTH_LOGIN_FAILURE',
        targetType: 'auth',
        details: 'User does not exist',
        ipAddress: clientIp,
        outcome: 'FAILURE'
      });
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (user.is_active !== 1) {
      auditService.log({
        userId: user.id,
        username: user.username,
        action: 'AUTH_LOGIN_DEACTIVATED',
        targetType: 'auth',
        details: 'Attempted login to deactivated account',
        ipAddress: clientIp,
        outcome: 'DENIED'
      });
      return res.status(403).json({ error: 'This account has been deactivated. Please contact your system administrator.' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      recordFailedAttempt(rateLimitKey);
      auditService.log({
        userId: user.id,
        username: user.username,
        action: 'AUTH_LOGIN_FAILURE',
        targetType: 'auth',
        details: 'Incorrect password entered',
        ipAddress: clientIp,
        outcome: 'FAILURE'
      });
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Login succeeded: Clear failed attempts
    clearFailedAttempts(rateLimitKey);

    // Update last login timestamp
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id);

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ error: 'Failed to establish secure session.' });
      }

      req.session.userId = user.id;

      auditService.log({
        userId: user.id,
        username: user.username,
        action: 'AUTH_LOGIN_SUCCESS',
        targetType: 'auth',
        details: `Successful login by ${user.username} [${user.role_id}]`,
        ipAddress: clientIp,
        outcome: 'SUCCESS'
      });

      const effectivePermissions = permissionsService.getUserEffectivePermissions(user.id);

      return res.json({
        message: 'Authentication successful.',
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          role: user.role_id
        },
        permissions: effectivePermissions
      });
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Internal server authentication error.' });
  }
});

/**
 * POST /api/auth/logout
 * Terminate session and clear cookie
 */
router.post('/logout', (req, res) => {
  const userId = req.session ? req.session.userId : null;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  if (userId) {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
    auditService.log({
      userId,
      username: user ? user.username : 'unknown',
      action: 'AUTH_LOGOUT',
      targetType: 'auth',
      details: 'User logged out',
      ipAddress: clientIp,
      outcome: 'SUCCESS'
    });
  }

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to terminate session.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Session logged out successfully.' });
  });
});

/**
 * GET /api/auth/me
 * Retrieve profile and live permissions of the current logged-in user
 */
router.get('/me', authenticate, (req, res) => {
  return res.json({
    user: req.user,
    permissions: req.user.permissions
  });
});

/**
 * PUT /api/auth/profile
 * Allow authenticated user to update their own username, full name, email, and password
 */
router.put('/profile', authenticate, (req, res) => {
  try {
    const userId = req.user.id;
    const { username, fullName, email, currentPassword, newPassword } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let updatedUsername = currentUser.username;
    if (username && username.trim() !== currentUser.username) {
      const cleanUsername = username.trim();
      if (cleanUsername.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
      }
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(cleanUsername, userId);
      if (existing) {
        return res.status(400).json({ error: 'Username is already taken by another account.' });
      }
      updatedUsername = cleanUsername;
    }

    let updatedFullName = fullName && fullName.trim() ? fullName.trim() : currentUser.full_name;
    let updatedEmail = email && email.trim() ? email.trim() : currentUser.email;

    if (newPassword && newPassword.trim()) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password.' });
      }
      if (!bcrypt.compareSync(currentPassword, currentUser.password_hash)) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      }
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(newPassword, salt);
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE users 
        SET username = ?, full_name = ?, email = ?, password_hash = ?, updated_at = ?
        WHERE id = ?
      `).run(updatedUsername, updatedFullName, updatedEmail, hash, now, userId);
    } else {
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE users 
        SET username = ?, full_name = ?, email = ?, updated_at = ?
        WHERE id = ?
      `).run(updatedUsername, updatedFullName, updatedEmail, now, userId);
    }

    auditService.log({
      userId,
      username: updatedUsername,
      action: 'USER_PROFILE_UPDATE',
      targetType: 'user',
      targetId: userId,
      details: {
        previousUsername: currentUser.username,
        newUsername: updatedUsername,
        passwordChanged: Boolean(newPassword)
      },
      ipAddress: clientIp,
      outcome: 'SUCCESS'
    });

    return res.json({
      message: 'Profile updated successfully.',
      user: {
        id: userId,
        username: updatedUsername,
        fullName: updatedFullName,
        email: updatedEmail,
        role: currentUser.role_id
      }
    });
  } catch (err) {
    console.error('Update profile error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

