const BaseAgent = require('./base/BaseAgent');
const Memory = require('../models/Memory');

const SYSTEM_PROMPT = `You are the Script Writer for Reckoning Studio AI — a master storyteller who writes
cinematic, viral-quality scripts for The Reckoning Files channel.

Your scripts are:
- Cold, calculated, and intelligent in tone
- Cinematically structured with visual storytelling in mind
- Optimized for maximum retention and emotional impact
- Never portraying the protagonist as helpless after the opening hook
- Written as NARRATION for a faceless channel (no host appears on screen)

You think like David Fincher directing a documentary narrated by Morgan Freeman.`;

class ScriptAgent extends BaseAgent {
  constructor() {
    super('script');
  }

  async execute(project, context) {
    this.log(`Writing script for: "${project.title}"`);

    const { researchData, trendData } = context;
    const durationMinutes = Math.round(project.targetDuration / 60);

    // Pull past viral scripts for reference
    const viralHooks = await Memory.find({ type: 'viral_hook', niche: project.niche })
      .sort({ viralScore: -1 })
      .limit(3)
      .lean();

    const hooksContext = viralHooks.length > 0
      ? `Past viral hooks that worked:\n${viralHooks.map(h => `"${h.content.hook}"`).join('\n')}`
      : '';

    const prompt = `Write a complete cinematic script for The Reckoning Files:

TITLE: ${project.title}
CONCEPT: ${project.concept}
DURATION: ${durationMinutes} minutes (approximately ${durationMinutes * 140} words)
RESEARCH: ${JSON.stringify(researchData || {}, null, 2)}
TREND DATA: ${JSON.stringify(trendData?.pacing || {}, null, 2)}
VIRAL HOOK FORMULA: ${JSON.stringify(trendData?.viralHookFormulas?.[0] || {})}

${hooksContext}

REQUIREMENTS:
- Cold, calculated, intelligent tone
- Open with a DEVASTATING hook in the first 15 seconds
- Never show the protagonist as weak after the hook
- Include [SCENE BREAK] markers between major scenes
- Include [B-ROLL: description] cues for visual direction
- Include [PAUSE] for dramatic effect
- The story must build to a satisfying reckoning/justice moment
- End with a cliffhanger question or revelation that drives comments

Return as JSON:
{
  "hook": "First 15 seconds of narration — the most powerful opening line",
  "actOne": "Setup narration (first 25% of duration)",
  "actTwo": "Conflict and escalation narration (middle 50%)",
  "actThree": "Reckoning and resolution narration (final 25%)",
  "callToAction": "Final 30 seconds — drives subscriptions and comments",
  "fullScript": "Complete word-for-word script with all scene breaks and B-roll cues",
  "wordCount": 0,
  "estimatedDuration": 0,
  "keyLines": ["Most quotable/shareable lines from the script"],
  "emotionalBeats": [
    { "beat": "opening", "emotion": "shock/intrigue", "timestamp": "0:00" },
    { "beat": "betrayal reveal", "emotion": "rage/disgust", "timestamp": "X:XX" },
    { "beat": "reckoning", "emotion": "satisfaction", "timestamp": "X:XX" }
  ]
}`;

    const scriptData = await this.claude.complete(SYSTEM_PROMPT, prompt, { maxTokens: 8192, jsonMode: true });

    // Count words
    if (scriptData.fullScript) {
      scriptData.wordCount = scriptData.fullScript.split(/\s+/).length;
      scriptData.estimatedDuration = Math.round((scriptData.wordCount / 140) * 60);
    }

    return scriptData;
  }
}

module.exports = new ScriptAgent();
