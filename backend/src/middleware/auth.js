const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn(`Invalid token: ${error.message}`);
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// Dev bypass middleware — uses a fake user when no real auth is configured
const devAuth = (req, res, next) => {
  if (process.env.NODE_ENV === 'development' && !req.header('Authorization')) {
    req.user = { id: 'dev_user_001', email: 'dev@youtubeauto.local' };
    return next();
  }
  return auth(req, res, next);
};

module.exports = process.env.NODE_ENV === 'development' ? devAuth : auth;
