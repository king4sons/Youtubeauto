const express = require('express');
const router = express.Router();
const videoGenerationService = require('../services/videoGenerationService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route   POST /api/video-generation/generate
 * @desc    Generate custom video
 * @access  Private
 */
router.post('/generate', auth, async (req, res) => {
  try {
    const { prompt, provider, format, duration, aspectRatio, style } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await videoGenerationService.generateVideo({
      prompt,
      provider,
      format,
      duration,
      aspectRatio,
      style,
      userId: req.user.id
    });

    res.json(result);
  } catch (error) {
    logger.error(`Generate video error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/video-generation/generate-shortform
 * @desc    Generate short-form video (TikTok, Shorts, Reels)
 * @access  Private
 */
router.post('/generate-shortform', auth, async (req, res) => {
  try {
    const { prompt, style } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await videoGenerationService.generateShortForm({
      prompt,
      style,
      userId: req.user.id
    });

    res.json(result);
  } catch (error) {
    logger.error(`Generate short-form error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/video-generation/generate-longform
 * @desc    Generate long-form video (YouTube - 1 minute)
 * @access  Private
 */
router.post('/generate-longform', auth, async (req, res) => {
  try {
    const { prompt, style } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await videoGenerationService.generateLongForm({
      prompt,
      style,
      userId: req.user.id
    });

    res.json(result);
  } catch (error) {
    logger.error(`Generate long-form error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/video-generation/generate-extended
 * @desc    Generate extended-form video (10-15 minutes)
 * @access  Private
 */
router.post('/generate-extended', auth, async (req, res) => {
  try {
    const { 
      prompt, 
      duration, 
      style,
      segments,
      autoGenerateSegments,
      includeVoiceover,
      includeMusic,
      musicGenre
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (duration && (duration < 600 || duration > 900)) {
      return res.status(400).json({ 
        error: 'Extended form duration must be between 10-15 minutes (600-900 seconds)' 
      });
    }

    const result = await videoGenerationService.generateExtendedForm({
      prompt,
      duration: duration || 600,
      style: style || 'documentary',
      segments: segments || [],
      autoGenerateSegments: autoGenerateSegments !== false,
      includeVoiceover: includeVoiceover || false,
      includeMusic: includeMusic || false,
      musicGenre: musicGenre || 'cinematic',
      userId: req.user.id
    });

    res.json(result);
  } catch (error) {
    logger.error(`Generate extended-form error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/video-generation/generate-from-script
 * @desc    Generate extended-form video from a full screenplay
 * @access  Private
 */
router.post('/generate-from-script', auth, async (req, res) => {
  try {
    const { script, title, style, voiceId, includeVoiceover, includeMusic, musicGenre } = req.body;

    if (!script || script.trim().length < 100) {
      return res.status(400).json({ error: 'A valid script is required (minimum 100 characters)' });
    }

    const result = await videoGenerationService.generateFromScript({
      script,
      title: title || 'My YouTube Video',
      style: style || 'cinematic',
      voiceId: voiceId || 'default',
      includeVoiceover: includeVoiceover !== false,
      includeMusic: includeMusic !== false,
      musicGenre: musicGenre || 'cinematic',
      userId: req.user.id
    });

    res.json(result);
  } catch (error) {
    logger.error(`Generate from script error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/video-generation/voiceover
 * @desc    Generate voiceover
 * @access  Private
 */
router.post('/voiceover', auth, async (req, res) => {
  try {
    const { text, voiceId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await videoGenerationService.generateVoiceover({
      text,
      voiceId,
      userId: req.user.id
    });

    res.json(result);
  } catch (error) {
    logger.error(`Generate voiceover error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/video-generation/:generationId/status
 * @desc    Check generation status
 * @access  Private
 */
router.get('/:generationId/status', auth, async (req, res) => {
  try {
    const result = await videoGenerationService.checkStatus(req.params.generationId);
    res.json(result);
  } catch (error) {
    logger.error(`Status check error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/video-generation/history
 * @desc    Get generation history
 * @access  Private
 */
router.get('/history', auth, async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const format = req.query.format || null;

    const history = await videoGenerationService.getGenerationHistory(
      req.user.id,
      limit,
      format
    );

    res.json({
      total: history.length,
      data: history
    });
  } catch (error) {
    logger.error(`History error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/video-generation/providers
 * @desc    Get available providers
 * @access  Public
 */
router.get('/providers', (req, res) => {
  try {
    const providers = videoGenerationService.getProviders();
    res.json({
      total: providers.length,
      data: providers
    });
  } catch (error) {
    logger.error(`Providers error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/video-generation/providers/extended
 * @desc    Get extended-form providers (10-15 minutes support)
 * @access  Public
 */
router.get('/providers/extended', (req, res) => {
  try {
    const providers = videoGenerationService.getExtendedFormProviders();
    res.json({
      total: providers.length,
      format: 'Extended Form (10-15 minutes)',
      data: providers
    });
  } catch (error) {
    logger.error(`Extended providers error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
