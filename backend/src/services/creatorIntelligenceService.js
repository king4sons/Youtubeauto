const { CREATOR_PROFILES, CONTENT_NICHES } = require('../config/constants');
const claudeService = require('./claudeService');
const Memory = require('../models/Memory');
const logger = require('../utils/logger');

/**
 * CreatorIntelligenceService
 * Analyzes creator profiles and generates content strategies modeled after
 * successful creators like @sina.growthtech.
 */
class CreatorIntelligenceService {
  constructor() {
    this.profiles = CREATOR_PROFILES;
    this.niches = CONTENT_NICHES;
  }

  getProfile(handle) {
    return this.profiles[handle] || null;
  }

  getNicheCreatorModel(nicheId) {
    const niche = Object.values(this.niches).find(n => n.id === nicheId);
    return niche?.creatorModel || null;
  }

  /**
   * Generate a content strategy modeled after a specific creator.
   * Used by ScriptAgent and TrendAgent when niche = growth_tech.
   */
  async generateCreatorModeledStrategy(concept, nicheId, duration) {
    const niche = Object.values(this.niches).find(n => n.id === nicheId);
    if (!niche?.creatorModel) return null;

    const creatorHandle = niche.creatorModel.handle;
    const profile = this.profiles[creatorHandle];
    if (!profile) return null;

    logger.info(`[CreatorIntelligence] Modeling strategy after ${creatorHandle}`);

    const systemPrompt = `You are a viral content strategist who has deeply studied the content
style of @${creatorHandle} on ${profile.platform}. You understand exactly what makes their
content go viral: ${profile.viralPatterns.peakViralTrigger}.

Their audience: ${JSON.stringify(profile.audienceProfile)}
Their hook formulas: ${JSON.stringify(profile.hookFormulas)}
Their video style: ${JSON.stringify(profile.videoStyle)}`;

    const prompt = `Generate a content strategy for this concept modeled after @${creatorHandle}'s style:

CONCEPT: ${concept}
NICHE: ${niche.name}
DURATION: ${Math.round(duration / 60)} minutes
CONTENT PILLARS: ${profile.contentPillars.join(', ')}

Return as JSON:
{
  "creatorModeledHook": "Opening line in @${creatorHandle}'s exact voice and style",
  "hookFormula": "Which hook formula from their repertoire this uses",
  "contentAngle": "The specific angle that fits their content pillars",
  "audiencePainPoint": "The specific pain point this targets from their audience",
  "toneInstructions": "How to write in their tone: ${niche.creatorModel.energy}",
  "scriptStyle": {
    "openingEnergy": "How to open with their energy",
    "deliveryNotes": "Pacing, pauses, emphasis patterns",
    "captionStyle": "Text overlay / caption approach",
    "closingCTA": "CTA in their style"
  },
  "visualStrategy": {
    "backgroundSuggestion": "Background setting that matches their authentic style",
    "cameraStyle": "${profile.videoStyle.cameraStyle}",
    "editingNotes": "${profile.videoStyle.editingPace}",
    "brollStyle": "B-roll suggestions that fit their aesthetic"
  },
  "viralPrediction": {
    "shareTrigger": "What will make people share this",
    "commentTrigger": "What will drive comments",
    "saveTrigger": "What will make people save this"
  },
  "titleFormulas": [
    "Title option 1 in their style",
    "Title option 2 in their style"
  ]
}`;

    return await claudeService.complete(systemPrompt, prompt, { jsonMode: true });
  }

  /**
   * Analyze what makes a piece of content fit a creator's style.
   * Used for quality checking before publish.
   */
  async scoreCreatorAlignment(script, nicheId) {
    const niche = Object.values(this.niches).find(n => n.id === nicheId);
    if (!niche?.creatorModel) return { score: null, applicable: false };

    const profile = this.profiles[niche.creatorModel.handle];
    if (!profile) return { score: null, applicable: false };

    const prompt = `Score how well this script aligns with @${profile.handle}'s content style:

SCRIPT EXCERPT:
${script.substring(0, 1000)}

CREATOR STYLE BENCHMARKS:
- Hook formulas they use: ${JSON.stringify(profile.hookFormulas)}
- Audience pain points: ${JSON.stringify(profile.audienceProfile.painPoints)}
- Viral trigger: ${profile.viralPatterns.peakViralTrigger}
- Share trigger: ${profile.viralPatterns.shareTrigger}

Score 0-100 and explain as JSON:
{
  "alignmentScore": 0,
  "hookAlignment": "Does the hook match their formula?",
  "toneAlignment": "Does the tone match their energy?",
  "audienceAlignment": "Does this speak to their audience's pain?",
  "viralAlignment": "Does this have their viral trigger?",
  "improvements": ["specific improvement 1", "specific improvement 2"]
}`;

    const systemPrompt = `You are a content analyst expert in @${profile.handle}'s TikTok style.`;
    return await claudeService.complete(systemPrompt, prompt, { jsonMode: true });
  }

  /**
   * Store a successful creator-modeled content pattern in memory.
   */
  async rememberSuccessfulPattern(projectId, nicheId, metrics) {
    const niche = Object.values(this.niches).find(n => n.id === nicheId);
    if (!niche?.creatorModel) return;

    await Memory.create({
      type: 'trend_pattern',
      key: `creator_model_${niche.creatorModel.handle}_${projectId}`,
      content: {
        creatorHandle: niche.creatorModel.handle,
        metrics,
        nicheId
      },
      projectId,
      niche: nicheId,
      viralScore: metrics.viralScore || 0,
      tags: ['creator_modeled', niche.creatorModel.handle]
    });
  }

  getAllProfiles() {
    return Object.values(this.profiles);
  }
}

module.exports = new CreatorIntelligenceService();
