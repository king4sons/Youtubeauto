const express = require('express');
const router = express.Router();
const videoService = require('../services/videoGenerationService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// GET /api/video/providers
router.get('/providers', (req, res) => {
  try {
    res.json({ data: videoService.getProviders() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/video/providers/:platform
router.get('/providers/:platform', (req, res) => {
  try {
    const providers = videoService.getProvidersForPlatform(req.params.platform);
    res.json({ platform: req.params.platform, data: providers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/video/generate — generate any video
router.post('/generate', auth, async (req, res) => {
  try {
    const { prompt, provider, format, duration, aspectRatio, style, platform } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const result = await videoService.generateVideo({
      prompt, provider, format, duration, aspectRatio, style, platform,
      userId: req.user.id
    });
    res.json(result);
  } catch (error) {
    logger.error(`Generate video error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/video/shortform
router.post('/shortform', auth, async (req, res) => {
  try {
    const { prompt, platform, provider, duration } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const result = await videoService.generateShortForm({
      prompt, platform: platform || 'tiktok', provider, duration,
      userId: req.user.id
    });
    res.json(result);
  } catch (error) {
    logger.error(`Short-form error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/video/longform
router.post('/longform', auth, async (req, res) => {
  try {
    const { prompt, platform, provider, duration } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const result = await videoService.generateLongForm({
      prompt, platform: platform || 'youtube', provider, duration,
      userId: req.user.id
    });
    res.json(result);
  } catch (error) {
    logger.error(`Long-form error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/video/voiceover
router.post('/voiceover', auth, async (req, res) => {
  try {
    const { text, voiceId } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const result = await videoService.generateVoiceover({ text, voiceId, userId: req.user.id });
    res.json(result);
  } catch (error) {
    logger.error(`Voiceover error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/video/status/:provider/:jobId
router.get('/status/:provider/:jobId', auth, async (req, res) => {
  try {
    const { provider, jobId } = req.params;
    const status = await videoService.checkJobStatus(provider, jobId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dev simulation status endpoint
router.get('/dev-status/:jobId', (req, res) => {
  const progress = Math.random();
  if (progress > 0.7) {
    res.json({ status: 'completed', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' });
  } else {
    res.json({ status: 'processing', progress: Math.round(progress * 100) });
  }
});

module.exports = router;
