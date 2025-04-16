const jwt = require('jsonwebtoken');
const config = require('../config');
console.log('JWT Secret:', process.env.JWT_SECRET);
console.log('JWT Expiry:', process.env.JWT_EXPIRY);
console.log('Config expiry:', config.auth.jwtExpiry);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, config.auth.jwtSecret);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticateToken };