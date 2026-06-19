const express = require('express');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const videoGenerationRoutes = require('./routes/videoGenerationRoutes');
const videoAnalysisRoutes = require('./routes/videoAnalysisRoutes');

app.use('/api/video-generation', videoGenerationRoutes);
app.use('/api/video-analysis', videoAnalysisRoutes);

module.exports = app;
