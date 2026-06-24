const express = require('express');
const router = express.Router();
const remotionRenderingService = require('../services/remotionRenderingService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route  POST /api/remotion/render/local
 * @desc   Render a Remotion video on this server (requires npx remotion CLI installed)
 * @access Private
 * @body   { format, prompt, style, title, channelName, accentColor, duration, segments, outputFileName }
 */
router.post('/render/local', auth, async (req, res) => {
  try {
    const { format, prompt, style, title, channelName, accentColor, duration, segments, outputFileName } = req.body;

    if (!format || !prompt) {
      return res.status(400).json({ error: 'format and prompt are required' });
    }

    const props = remotionRenderingService.buildProps({
      format, prompt, style, title, channelName, accentColor, duration, segments,
    });

    const result = await remotionRenderingService.renderLocally({ format, props, outputFileName });

    res.json({
      success: true,
      renderPath: 'local',
      outputPath: result.outputPath,
      format,
    });
  } catch (error) {
    logger.error(`Local Remotion render error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route  POST /api/remotion/render/lambda
 * @desc   Kick off a Remotion Lambda render (cloud, no local headless Chrome needed)
 * @access Private
 * @body   { format, prompt, style, title, channelName, accentColor, duration, segments }
 */
router.post('/render/lambda', auth, async (req, res) => {
  try {
    const { format, prompt, style, title, channelName, accentColor, duration, segments } = req.body;

    if (!format || !prompt) {
      return res.status(400).json({ error: 'format and prompt are required' });
    }

    const props = remotionRenderingService.buildProps({
      format, prompt, style, title, channelName, accentColor, duration, segments,
    });

    const result = await remotionRenderingService.renderWithLambda({ format, props });

    res.json({
      success: true,
      renderPath: 'lambda',
      renderId: result.renderId,
      bucketName: result.bucketName,
      format,
    });
  } catch (error) {
    logger.error(`Lambda Remotion render error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route  GET /api/remotion/render/lambda/:renderId/progress
 * @desc   Poll a Lambda render for completion
 * @access Private
 * @query  bucketName (required)
 */
router.get('/render/lambda/:renderId/progress', auth, async (req, res) => {
  try {
    const { renderId } = req.params;
    const { bucketName } = req.query;

    if (!bucketName) {
      return res.status(400).json({ error: 'bucketName query param is required' });
    }

    const progress = await remotionRenderingService.getLambdaRenderProgress({ renderId, bucketName });

    res.json({ success: true, renderId, ...progress });
  } catch (error) {
    logger.error(`Lambda progress check error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route  GET /api/remotion/compositions
 * @desc   List available Remotion compositions and their metadata
 * @access Public
 */
router.get('/compositions', (req, res) => {
  res.json({
    compositions: [
      {
        id: 'ShortFormVideo',
        format: 'shortform',
        description: '30-second portrait video (1080x1920) for TikTok, Shorts, Reels',
        fps: 30,
        durationInFrames: 900,
        width: 1080,
        height: 1920,
      },
      {
        id: 'LongFormVideo',
        format: 'longform',
        description: '60-second landscape video (1920x1080) for YouTube',
        fps: 30,
        durationInFrames: 1800,
        width: 1920,
        height: 1080,
      },
      {
        id: 'ExtendedVideo',
        format: 'extended',
        description: '10-minute landscape video (1920x1080) for long-form YouTube',
        fps: 30,
        durationInFrames: 18000,
        width: 1920,
        height: 1080,
      },
    ],
    renderPaths: {
      local: {
        description: 'Render on this server using npx remotion CLI',
        requirements: 'Node 18+, Chrome installed, npm install run in /remotion',
      },
      lambda: {
        description: 'Cloud render via Remotion Lambda (no local Chrome needed)',
        requirements: 'AWS account, REMOTION_APP_* env vars, deployed Lambda function',
        setupDocs: 'https://www.remotion.dev/docs/lambda',
      },
    },
  });
});

module.exports = router;
