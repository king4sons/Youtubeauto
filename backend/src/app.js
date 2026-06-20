require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Reckoning Studio AI',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes
const projectRoutes = require('./routes/projectRoutes');
const videoGenerationRoutes = require('./routes/videoGenerationRoutes');

app.use('/api/projects', projectRoutes);
app.use('/api/video-generation', videoGenerationRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database connection
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/reckoning-studio';
  try {
    await mongoose.connect(mongoUri);
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    logger.info(`Reckoning Studio AI running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

start();

module.exports = { app, server };
