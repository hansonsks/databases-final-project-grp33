const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const pool = require('../database/pool');
const config = require('../config');

// User Registration
router.post('/register', [
  check('username', 'Username is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  check('name', 'Name is required').not().isEmpty()
], async (req, res) => {
  // Validation logic and user creation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, name } = req.body;

  try {
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (username, email, password, name) VALUES ($1, $2, $3, $4) RETURNING user_id, username, email, name, created_at',
      [username, email, hashedPassword, name]
    );

    const user = result.rows[0];

    // Create and return JWT
    const token = jwt.sign(
      { userId: user.user_id, username: user.username },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiry }
    );

    res.status(201).json({
      token,
      userId: user.user_id,
      username: user.username,
      name: user.name
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// User Login
router.post('/login', [
  check('username', 'Username or email is required').not().isEmpty(),
  check('password', 'Password is required').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    // Check if username or email
    const isEmail = username.includes('@');
    const query = isEmail 
      ? 'SELECT * FROM users WHERE email = $1'
      : 'SELECT * FROM users WHERE username = $1';

    const result = await pool.query(query, [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login time
    await pool.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', 
      [user.user_id]);

    // Create and return JWT
    const token = jwt.sign(
      { userId: user.user_id, username: user.username },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiry }
    );

    res.json({
      token,
      userId: user.user_id,
      username: user.username,
      name: user.name
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout endpoint (optional - could be handled client-side)
router.post('/logout', async (req, res) => {
  // Since we're using JWT, actual logout is handled on the client by removing the token
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;