const BaseAgent = require('./base/BaseAgent');
const memoryService = require('../services/memoryService');

const SYSTEM_PROMPT = `You are the Memory Agent for Reckoning Studio AI. You analyze completed
projects and extract winning patterns, hooks, structures, and insights that should be remembered
for future content creation.

You identify what made successful content work and distill it into reusable patterns
that improve future generations.`;

class MemoryAgent extends BaseAgent {
  constructor() {
    super('memory');
  }

  async execute(project, context) {
    this.log(`Extracting learnings from: "${project.title}"`);

    const { script, trendData, storyboard, viralScoreData, seoData } = context;

    // Extract and store winning patterns
    const memories = await this._extractMemories(project, context);

    for (const memory of memories) {
      await memoryService.store(memory);
    }

    return {
      memoriesStored: memories.length,
      types: memories.map(m => m.type),
      summary: `Stored ${memories.length} learnings from "${project.title}"`
    };
  }

  async _extractMemories(project, context) {
    const { script, storyboard, viralScoreData } = context;
    const memories = [];

    // Store viral hook if it scored well
    if (viralScoreData?.scores?.hookScore >= 85 && script?.hook) {
      memories.push({
        type: 'viral_hook',
        key: `hook_${project._id}`,
        content: {
          hook: script.hook,
          concept: project.concept,
          hookScore: viralScoreData.scores.hookScore,
          formula: await this._analyzeHookFormula(script.hook)
        },
        projectId: project._id,
        niche: project.niche,
        viralScore: viralScoreData.scores.viralScore || 0
      });
    }

    // Store story structure if story score is high
    if (viralScoreData?.scores?.storyScore >= 88) {
      memories.push({
        type: 'story_structure',
        key: `structure_${project._id}`,
        content: {
          emotionalArc: storyboard?.musicMoodMap,
          sceneCount: storyboard?.scenes?.length,
          narrativeBeats: script?.emotionalBeats,
          storyScore: viralScoreData.scores.storyScore,
          concept: project.concept
        },
        projectId: project._id,
        niche: project.niche,
        viralScore: viralScoreData.scores.viralScore || 0
      });
    }

    // Store editing style if retention is high
    if (viralScoreData?.scores?.retentionScore >= 90) {
      memories.push({
        type: 'editing_style',
        key: `editing_${project._id}`,
        content: {
          duration: project.targetDuration,
          sceneCount: storyboard?.scenes?.length,
          retentionScore: viralScoreData.scores.retentionScore,
          pacing: context.editingData?.editingPlan?.paceAnalysis
        },
        projectId: project._id,
        niche: project.niche,
        viralScore: viralScoreData.scores.viralScore || 0
      });
    }

    return memories;
  }

  async _analyzeHookFormula(hook) {
    const prompt = `Analyze this viral hook and extract its formula:

HOOK: "${hook}"

Return as JSON:
{
  "formula": "The abstract formula this hook follows",
  "technique": "The specific psychological technique",
  "emotion": "Primary emotion triggered",
  "curiosityGap": "What question does this create in the viewer's mind"
}`;

    return await this.claude.complete(
      'You are a viral content analyst. Extract the formula from viral hooks.',
      prompt,
      { jsonMode: true }
    );
  }

  async getRelevantMemories(type, niche, limit = 5) {
    return await memoryService.retrieve(type, niche, limit);
  }
}

module.exports = new MemoryAgent();
