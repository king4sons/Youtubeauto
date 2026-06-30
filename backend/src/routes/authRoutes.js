const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Strict rate limit on login — 10 attempts per 15 minutes
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' }
});

// POST /api/auth/login
router.post('/login', loginLimit, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !adminPasswordHash) {
      logger.error('ADMIN_EMAIL or ADMIN_PASSWORD_HASH not set in .env');
      return res.status(500).json({ error: 'Server not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD_HASH in .env' });
    }

    // Check email (case-insensitive)
    if (email.toLowerCase() !== adminEmail.toLowerCase()) {
      logger.warn(`Failed login attempt for email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, adminPasswordHash);
    if (!passwordMatch) {
      logger.warn(`Failed login attempt — wrong password for: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: 'admin', email: adminEmail },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '30d' }
    );

    logger.info(`Admin login successful: ${adminEmail}`);
    res.json({ token, email: adminEmail });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/verify — check if a token is still valid
router.post('/verify', (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ valid: false });

  try {
    jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    res.json({ valid: true });
  } catch {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
