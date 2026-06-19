const express = require('express');
const router = express.Router();
const videoAnalysisService = require('../services/videoAnalysisService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route   POST /api/video-analysis/watch
 * @desc    Start video analysis — download, extract frames, transcribe
 * @access  Private
 */
router.post('/watch', auth, async (req, res) => {
  try {
    const { url, maxFrames, every, noWhisper } = req.body;

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({ error: 'A valid video URL is required' });
    }

    const result = await videoAnalysisService.startAnalysis(url, { maxFrames, every, noWhisper });
    res.json(result);
  } catch (error) {
    logger.error(`Video analysis start error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/video-analysis/:analysisId/status
 * @desc    Poll analysis job status
 * @access  Private
 */
router.get('/:analysisId/status', auth, (req, res) => {
  try {
    const result = videoAnalysisService.getStatus(req.params.analysisId);
    res.json(result);
  } catch (error) {
    const code = error.message === 'Analysis not found' ? 404 : 500;
    res.status(code).json({ error: error.message });
  }
});

/**
 * @route   GET /api/video-analysis/:analysisId/index
 * @desc    Get timestamped frame index
 * @access  Private
 */
router.get('/:analysisId/index', auth, (req, res) => {
  try {
    const index = videoAnalysisService.getIndex(req.params.analysisId);
    res.json({ total: index.length, frames: index });
  } catch (error) {
    const code = error.message.includes('not found') ? 404 : 400;
    res.status(code).json({ error: error.message });
  }
});

/**
 * @route   GET /api/video-analysis/:analysisId/transcript
 * @desc    Get full transcript text
 * @access  Private
 */
router.get('/:analysisId/transcript', auth, (req, res) => {
  try {
    const text = videoAnalysisService.getTranscript(req.params.analysisId);
    res.json({ transcript: text, wordCount: text.trim().split(/\s+/).filter(Boolean).length });
  } catch (error) {
    const code = error.message.includes('not found') ? 404 : 400;
    res.status(code).json({ error: error.message });
  }
});

/**
 * @route   GET /api/video-analysis/:analysisId/frames/:frameName
 * @desc    Serve a single frame image
 * @access  Private
 */
router.get('/:analysisId/frames/:frameName', auth, (req, res) => {
  try {
    const framePath = videoAnalysisService.getFramePath(req.params.analysisId, req.params.frameName);
    res.sendFile(framePath);
  } catch (error) {
    const code = error.message.includes('not found') || error.message.includes('Invalid') ? 404 : 400;
    res.status(code).json({ error: error.message });
  }
});

module.exports = router;
