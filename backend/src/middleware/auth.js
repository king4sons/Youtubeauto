const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    // Allow unauthenticated in development
    if (process.env.NODE_ENV !== 'production') {
      req.user = { id: 'dev-user' };
      return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'reckoning-studio-secret');
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn(`Auth failed: ${error.message}`);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = auth;
