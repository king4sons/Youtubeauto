const BaseAgent = require('./base/BaseAgent');
const { VIRAL_THRESHOLDS } = require('../config/constants');

const SYSTEM_PROMPT = `You are the Viral Intelligence Agent for Reckoning Studio AI — the gatekeeper
that scores every project before it can proceed to render.

You analyze content through five lenses:
1. Hook Score — Does the opening guarantee the viewer stays?
2. Retention Score — Does the content maintain attention throughout?
3. Viral Score — Will people share this?
4. Emotional Score — Does this create strong emotional responses?
5. Story Score — Is this a satisfying, complete narrative?

NO VIDEO RENDERS unless it scores 90+ on Viral, Retention, AND Story.
You are brutally honest. You are not here to validate — you are here to ensure excellence.

Think like a YouTube algorithm combined with a master storyteller.`;

class ViralIntelligenceAgent extends BaseAgent {
  constructor() {
    super('viral_intelligence');
    this.thresholds = VIRAL_THRESHOLDS;
  }

  async execute(project, context) {
    this.log(`Scoring viral potential for: "${project.title}"`);

    const { script, storyboard, trendData, researchData } = context;

    const scores = await this._scoreContent(project, script, storyboard, trendData, researchData);
    const passed = this._checkGate(scores);

    if (!passed) {
      const improvements = await this._generateImprovements(project, scores, script, storyboard);
      return {
        passed: false,
        scores,
        improvements,
        blockedReason: this._getBlockedReason(scores)
      };
    }

    return {
      passed: true,
      scores,
      analysis: scores.analysis,
      improvements: []
    };
  }

  async _scoreContent(project, script, storyboard, trendData, researchData) {
    const prompt = `Score this video project for viral potential with ruthless precision:

PROJECT: ${project.title}
CONCEPT: ${project.concept}
DURATION: ${Math.round(project.targetDuration / 60)} minutes
HOOK: ${script?.hook || 'NOT PROVIDED'}
SCRIPT EXCERPT: ${(script?.fullScript || '').substring(0, 1500)}
SCENE COUNT: ${storyboard?.scenes?.length || 0}
EMOTIONAL CORE: ${researchData?.emotionalCore || 'Unknown'}
TREND ALIGNMENT: ${JSON.stringify(trendData?.viralHookFormulas?.[0] || {})}

Score each dimension (0-100) and provide detailed analysis:
{
  "hookScore": 0,
  "hookAnalysis": "Why this score — be specific about what works and what doesn't",
  "retentionScore": 0,
  "retentionAnalysis": "Will people watch to the end? Why or why not?",
  "viralScore": 0,
  "viralAnalysis": "Will people share this? What makes it shareable or not?",
  "emotionalScore": 0,
  "emotionalAnalysis": "What emotions does this trigger? How strongly?",
  "storyScore": 0,
  "storyAnalysis": "Is this a satisfying narrative? Does it have a proper arc?",
  "shareabilityScore": 0,
  "overallScore": 0,
  "analysis": "Overall assessment paragraph",
  "topStrengths": ["strength 1", "strength 2", "strength 3"],
  "criticalWeaknesses": ["weakness 1", "weakness 2"],
  "predictedPerformance": "Realistic performance prediction if published as-is",
  "competitiveAdvantage": "What makes this unique vs. similar content"
}`;

    return await this.claude.complete(SYSTEM_PROMPT, prompt, { jsonMode: true });
  }

  _checkGate(scores) {
    return (
      scores.viralScore >= this.thresholds.VIRAL_SCORE &&
      scores.retentionScore >= this.thresholds.RETENTION_SCORE &&
      scores.storyScore >= this.thresholds.STORY_SCORE
    );
  }

  async _generateImprovements(project, scores, script, storyboard) {
    const failedDimensions = [];
    if (scores.viralScore < this.thresholds.VIRAL_SCORE) failedDimensions.push(`Viral Score: ${scores.viralScore}/90`);
    if (scores.retentionScore < this.thresholds.RETENTION_SCORE) failedDimensions.push(`Retention Score: ${scores.retentionScore}/90`);
    if (scores.storyScore < this.thresholds.STORY_SCORE) failedDimensions.push(`Story Score: ${scores.storyScore}/90`);

    const prompt = `This video project FAILED the viral gate. Provide specific, actionable improvements:

PROJECT: ${project.title}
CONCEPT: ${project.concept}

FAILED DIMENSIONS:
${failedDimensions.join('\n')}

SCORES:
- Hook: ${scores.hookScore} (${scores.hookAnalysis})
- Retention: ${scores.retentionScore} (${scores.retentionAnalysis})
- Viral: ${scores.viralScore} (${scores.viralAnalysis})
- Emotional: ${scores.emotionalScore} (${scores.emotionalAnalysis})
- Story: ${scores.storyScore} (${scores.storyAnalysis})

CURRENT HOOK: "${script?.hook || 'none'}"

Provide specific improvements as JSON:
{
  "criticalFixes": [
    {
      "dimension": "viral|retention|story|hook|emotional",
      "problem": "Specific problem",
      "solution": "Specific solution with example",
      "scoreImpact": "+X points expected",
      "priority": 1
    }
  ],
  "revisedHook": "Rewritten hook that would score 95+",
  "storyFixes": "What needs to change in the narrative structure",
  "retentionFixes": "Specific retention improvements",
  "estimatedScoreAfterFixes": {
    "viralScore": 0,
    "retentionScore": 0,
    "storyScore": 0
  },
  "shouldRewriteScript": true,
  "shouldPivotConcept": false,
  "pivotSuggestion": "Alternative angle if concept should change"
}`;

    return await this.claude.complete(SYSTEM_PROMPT, prompt, { jsonMode: true });
  }

  _getBlockedReason(scores) {
    const reasons = [];
    if (scores.viralScore < this.thresholds.VIRAL_SCORE) {
      reasons.push(`Viral Score ${scores.viralScore} < required ${this.thresholds.VIRAL_SCORE}`);
    }
    if (scores.retentionScore < this.thresholds.RETENTION_SCORE) {
      reasons.push(`Retention Score ${scores.retentionScore} < required ${this.thresholds.RETENTION_SCORE}`);
    }
    if (scores.storyScore < this.thresholds.STORY_SCORE) {
      reasons.push(`Story Score ${scores.storyScore} < required ${this.thresholds.STORY_SCORE}`);
    }
    return reasons.join('; ');
  }
}

module.exports = new ViralIntelligenceAgent();
