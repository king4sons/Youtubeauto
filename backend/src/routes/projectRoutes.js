const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const pipelineOrchestrator = require('../orchestrator/PipelineOrchestrator');
const agentBus = require('../orchestrator/AgentBus');
const { VIRAL_THRESHOLDS, VIDEO_FORMATS } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * POST /api/projects
 * Create a new project and optionally start the pipeline
 */
router.post('/', async (req, res) => {
  try {
    const {
      title,
      concept,
      targetDuration,
      targetPlatforms = ['youtube'],
      niche = 'reckoning_files',
      aspectRatio = '16:9',
      style = 'cinematic',
      autoStart = false,
      userId
    } = req.body;

    if (!title || !concept || !targetDuration) {
      return res.status(400).json({ error: 'title, concept, and targetDuration are required' });
    }

    const project = await Project.create({
      userId: userId || req.user?.id || 'default',
      title,
      concept,
      targetDuration,
      targetPlatforms,
      niche,
      aspectRatio,
      style
    });

    if (autoStart) {
      // Start pipeline in background
      pipelineOrchestrator.run(project._id).catch(err =>
        logger.error(`Background pipeline failed: ${err.message}`)
      );
    }

    res.status(201).json({
      success: true,
      projectId: project._id,
      title: project.title,
      status: project.pipelineStatus,
      autoStarted: autoStart
    });
  } catch (error) {
    logger.error(`Create project error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:id/start
 * Start the AI pipeline for a project
 */
router.post('/:id/start', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (project.pipelineStatus === 'processing') {
      return res.status(409).json({ error: 'Pipeline already running' });
    }

    // Start in background
    pipelineOrchestrator.run(project._id).catch(err =>
      logger.error(`Pipeline failed for ${project._id}: ${err.message}`)
    );

    res.json({ success: true, message: 'Pipeline started', projectId: project._id });
  } catch (error) {
    logger.error(`Start pipeline error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects
 * List projects for a user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId || req.user?.id || 'default';
    const status = req.query.status;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;

    const filter = { userId };
    if (status) filter.pipelineStatus = status;

    const total = await Project.countDocuments(filter);
    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .select('-stageStatuses -videoPrompts -storyboard')
      .lean();

    res.json({
      total,
      page,
      pages: Math.ceil(total / limit),
      data: projects
    });
  } catch (error) {
    logger.error(`List projects error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:id
 * Get full project details
 */
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (error) {
    logger.error(`Get project error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:id/pipeline
 * Get pipeline status and stage details
 */
router.get('/:id/pipeline', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .select('title pipelineStatus currentStage stageStatuses viralScore viralGatePassed totalScenes completedScenes')
      .lean();

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const stageStatuses = project.stageStatuses
      ? Object.fromEntries(Object.entries(project.stageStatuses))
      : {};

    res.json({
      projectId: project._id,
      title: project.title,
      pipelineStatus: project.pipelineStatus,
      currentStage: project.currentStage,
      stages: stageStatuses,
      viralScore: project.viralScore,
      viralGatePassed: project.viralGatePassed,
      totalScenes: project.totalScenes,
      completedScenes: project.completedScenes,
      recentMessages: agentBus.getMessages(String(project._id), 20)
    });
  } catch (error) {
    logger.error(`Pipeline status error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:id/stream
 * SSE stream of pipeline events
 */
router.get('/:id/stream', (req, res) => {
  const projectId = req.params.id;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send recent messages immediately
  const recent = agentBus.getMessages(projectId, 30);
  recent.forEach(msg => send(msg));

  const handler = (msg) => {
    if (String(msg.projectId) === projectId) send(msg);
  };
  agentBus.on('message', handler);

  req.on('close', () => {
    agentBus.off('message', handler);
  });
});

/**
 * GET /api/projects/stats/overview
 * Dashboard stats
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const userId = req.query.userId || req.user?.id || 'default';

    const [total, completed, processing, blocked] = await Promise.all([
      Project.countDocuments({ userId }),
      Project.countDocuments({ userId, pipelineStatus: 'completed' }),
      Project.countDocuments({ userId, pipelineStatus: 'processing' }),
      Project.countDocuments({ userId, pipelineStatus: 'blocked' })
    ]);

    const topProjects = await Project.find({ userId, viralGatePassed: true })
      .sort({ 'viralScore.viralScore': -1 })
      .limit(5)
      .select('title viralScore targetDuration targetPlatforms createdAt')
      .lean();

    res.json({
      totalProjects: total,
      completed,
      processing,
      blocked,
      failed: total - completed - processing - blocked,
      viralThresholds: VIRAL_THRESHOLDS,
      topProjects
    });
  } catch (error) {
    logger.error(`Stats error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
