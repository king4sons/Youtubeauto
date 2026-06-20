const express = require('express');
const router = express.Router();
const creatorIntelligenceService = require('../services/creatorIntelligenceService');
const { CONTENT_NICHES, CREATOR_PROFILES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * GET /api/creators
 * List all creator profiles in the system
 */
router.get('/', (req, res) => {
  try {
    const profiles = creatorIntelligenceService.getAllProfiles();
    res.json({ total: profiles.length, data: profiles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/creators/niches
 * List all available content niches
 */
router.get('/niches', (req, res) => {
  try {
    const niches = Object.values(CONTENT_NICHES).map(n => ({
      id: n.id,
      name: n.name,
      themes: n.themes,
      tone: n.tone,
      format: n.format || 'cinematic_faceless',
      creatorModel: n.creatorModel ? {
        handle: n.creatorModel.handle,
        platform: n.creatorModel.platform,
        style: n.creatorModel.style
      } : null
    }));
    res.json({ total: niches.length, data: niches });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/creators/:handle
 * Get detailed creator profile
 */
router.get('/:handle', (req, res) => {
  try {
    const profile = creatorIntelligenceService.getProfile(req.params.handle);
    if (!profile) return res.status(404).json({ error: 'Creator profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/creators/strategy
 * Generate a creator-modeled content strategy for a concept
 */
router.post('/strategy', async (req, res) => {
  try {
    const { concept, nicheId = 'growth_tech', targetDuration = 60 } = req.body;

    if (!concept) return res.status(400).json({ error: 'concept is required' });

    const strategy = await creatorIntelligenceService.generateCreatorModeledStrategy(
      concept, nicheId, targetDuration
    );

    if (!strategy) {
      return res.status(400).json({ error: `No creator model configured for niche: ${nicheId}` });
    }

    res.json({ success: true, nicheId, strategy });
  } catch (error) {
    logger.error(`Creator strategy error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/creators/score-alignment
 * Score how well a script aligns with a creator's style
 */
router.post('/score-alignment', async (req, res) => {
  try {
    const { script, nicheId = 'growth_tech' } = req.body;
    if (!script) return res.status(400).json({ error: 'script is required' });

    const score = await creatorIntelligenceService.scoreCreatorAlignment(script, nicheId);
    res.json({ success: true, ...score });
  } catch (error) {
    logger.error(`Alignment score error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
