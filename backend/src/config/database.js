const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;

    // In development with no URI set, spin up an in-memory MongoDB automatically
    if (!uri || uri === 'mongodb://localhost:27017/youtubeauto') {
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        uri = mongod.getUri();
        logger.info('Using in-memory MongoDB (dev mode — data resets on restart)');
      } catch {
        uri = 'mongodb://localhost:27017/youtubeauto';
      }
    }

    const conn = await mongoose.connect(uri);
    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    logger.warn(`MongoDB unavailable: ${error.message} — running without database (auth-only mode)`);
    // Don't exit; auth routes work without MongoDB
  }
};

module.exports = connectDB;
