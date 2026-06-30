const express = require('express');
const router = express.Router();
const contentPipeline = require('../services/contentPipelineService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

// POST /api/content/create — Step 1: topic → script
router.post('/create', auth, async (req, res) => {
  try {
    const { topic, platform, contentType, style, targetAudience } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic is required' });

    const result = await contentPipeline.createFromTopic({
      topic, platform, contentType, style, targetAudience,
      userId: req.user.id
    });
    res.json(result);
  } catch (error) {
    logger.error(`Create content error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/content/:id/generate-video — Step 2: generate video
router.post('/:id/generate-video', auth, async (req, res) => {
  try {
    const { provider, style } = req.body;
    const result = await contentPipeline.generateVideoForContent(req.params.id, { provider, style });
    res.json(result);
  } catch (error) {
    logger.error(`Generate video error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/content/:id/status — Step 3: poll video status
router.get('/:id/status', auth, async (req, res) => {
  try {
    const result = await contentPipeline.syncVideoStatus(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error(`Status sync error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/content — list all content
router.get('/', auth, async (req, res) => {
  try {
    const { platform, contentType, status } = req.query;
    const filters = {};
    if (platform) filters.platform = platform;
    if (contentType) filters.contentType = contentType;
    if (status) filters['video.status'] = status;

    const items = await contentPipeline.getContentList(req.user.id, filters);
    res.json({ total: items.length, data: items });
  } catch (error) {
    logger.error(`List content error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/content/:id — get single
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await contentPipeline.getContent(req.params.id, req.user.id);
    res.json(item);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// PATCH /api/content/:id — update
router.patch('/:id', auth, async (req, res) => {
  try {
    const item = await contentPipeline.updateContent(req.params.id, req.user.id, req.body);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/content/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await contentPipeline.deleteContent(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/content/ideas
router.post('/ideas/generate', auth, async (req, res) => {
  try {
    const { niche, platform, count, style } = req.body;
    if (!niche) return res.status(400).json({ error: 'niche is required' });
    const ideas = await contentPipeline.generateIdeas({ niche, platform, count, style });
    res.json({ total: ideas.length, data: ideas });
  } catch (error) {
    logger.error(`Ideas generation error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
