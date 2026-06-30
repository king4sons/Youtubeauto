const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const replitConnector = require('../services/replitConnector');
const logger = require('../utils/logger');

// All connector routes require auth
router.use(auth);

// GET /api/connector/status — connection health
router.get('/status', async (req, res) => {
  const ping = await replitConnector.ping();
  res.json({
    configured: replitConnector.isConfigured,
    workerUrl: replitConnector.workerUrl,
    ...ping
  });
});

// GET /api/connector/jobs — list jobs on the Replit worker
router.get('/jobs', async (req, res) => {
  if (!replitConnector.isConfigured) {
    return res.status(400).json({ error: 'Replit worker not configured. Set REPLIT_WORKER_URL in .env' });
  }
  try {
    const jobs = await replitConnector.listJobs();
    res.json(jobs);
  } catch (err) {
    logger.error(`Connector list jobs error: ${err.message}`);
    res.status(502).json({ error: `Worker unreachable: ${err.message}` });
  }
});

// GET /api/connector/jobs/:jobId — get job status
router.get('/jobs/:jobId', async (req, res) => {
  if (!replitConnector.isConfigured) {
    return res.status(400).json({ error: 'Replit worker not configured' });
  }
  try {
    const status = await replitConnector.getJobStatus(req.params.jobId);
    res.json(status);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// DELETE /api/connector/jobs/:jobId — cancel a job
router.delete('/jobs/:jobId', async (req, res) => {
  if (!replitConnector.isConfigured) {
    return res.status(400).json({ error: 'Replit worker not configured' });
  }
  try {
    const result = await replitConnector.cancelJob(req.params.jobId);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/connector/providers — get providers from Replit worker
router.get('/providers', async (req, res) => {
  if (!replitConnector.isConfigured) {
    return res.status(400).json({ error: 'Replit worker not configured' });
  }
  try {
    const providers = await replitConnector.getProviders();
    res.json(providers);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/connector/reload — reload env config without restart
router.post('/reload', (req, res) => {
  replitConnector.reload();
  res.json({
    configured: replitConnector.isConfigured,
    workerUrl: replitConnector.workerUrl
  });
});

module.exports = router;
