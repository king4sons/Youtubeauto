const BaseAgent = require('./base/BaseAgent');
const Memory = require('../models/Memory');

const SYSTEM_PROMPT = `You are the Trend Intelligence Agent for Reckoning Studio AI. You analyze
viral patterns, audience retention data, trending story structures, and hook formulas across
YouTube, TikTok, and Instagram.

Your job: determine the optimal viral strategy for the current content based on what's working NOW.
Think like a data scientist who understands human psychology and viral loops.`;

class TrendAgent extends BaseAgent {
  constructor() {
    super('trend');
  }

  async execute(project, context) {
    this.log(`Analyzing trends for: "${project.title}"`);

    // Pull relevant memories of past viral patterns
    const pastPatterns = await Memory.find({ type: 'trend_pattern', niche: project.niche })
      .sort({ viralScore: -1 })
      .limit(5)
      .lean();

    const memoryContext = pastPatterns.length > 0
      ? `Past viral patterns we know work:\n${JSON.stringify(pastPatterns.map(p => p.content), null, 2)}`
      : 'No past trend data yet — analyze from first principles.';

    const prompt = `Analyze trending patterns for this content:

CONCEPT: ${project.concept}
RESEARCH: ${JSON.stringify(context.researchData || {})}
DURATION: ${Math.round(project.targetDuration / 60)} minutes
PLATFORMS: ${(project.targetPlatforms || ['youtube']).join(', ')}

${memoryContext}

Return trend analysis as JSON:
{
  "trendingFormats": ["format 1", "format 2"],
  "viralHookFormulas": [
    { "formula": "The hook formula", "example": "example text", "why": "psychology" }
  ],
  "optimalThumbnailStyle": "description of what converts",
  "titleFormulas": ["formula 1", "formula 2", "formula 3"],
  "trendingKeywords": ["keyword 1", "keyword 2", "..."],
  "retentionTechniques": ["technique 1", "technique 2"],
  "pacing": {
    "openingSeconds": "What happens in first 15 seconds",
    "firstMinute": "What happens in first minute",
    "midPoint": "Mid-video retention technique",
    "closing": "How to end for max comments"
  },
  "emotionalArc": ["emotion 1 → emotion 2 → emotion 3"],
  "viralTriggers": ["trigger 1", "trigger 2"],
  "competitorInsights": "What similar successful videos do",
  "uniqueAngle": "What will make THIS video stand out",
  "callToActionStrategy": "How to maximize engagement actions",
  "uploadTiming": "Best time to publish",
  "predictedPerformance": {
    "estimatedViews7Days": "range",
    "peakViewsDay": "day 1-3",
    "viralPotential": "low|medium|high|explosive"
  }
}`;

    const trendData = await this.claude.complete(SYSTEM_PROMPT, prompt, { jsonMode: true });

    return trendData;
  }
}

module.exports = new TrendAgent();
