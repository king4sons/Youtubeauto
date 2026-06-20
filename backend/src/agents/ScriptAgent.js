const BaseAgent = require('./base/BaseAgent');
const Memory = require('../models/Memory');
const creatorIntelligence = require('../services/creatorIntelligenceService');

const SYSTEM_PROMPTS = {
  reckoning_files: `You are the Script Writer for Reckoning Studio AI — a master storyteller who writes
cinematic, viral-quality scripts for The Reckoning Files channel.

Your scripts are:
- Cold, calculated, and intelligent in tone
- Cinematically structured with visual storytelling in mind
- Optimized for maximum retention and emotional impact
- Never portraying the protagonist as helpless after the opening hook
- Written as NARRATION for a faceless channel (no host appears on screen)

You think like David Fincher directing a documentary narrated by Morgan Freeman.`,

  growth_tech: `You are the Script Writer for Reckoning Studio AI — a viral business content specialist
who writes in the raw, direct, high-conviction style of top GrowthTech creators like @sina.growthtech.

Your scripts are:
- Direct, urgent, and conversational — like talking to a smart friend
- Packed with specific numbers, counter-intuitive insights, and actionable takeaways
- Built around a clear business insight the audience can USE immediately
- Opening with a bold claim or story that creates instant curiosity
- Structured for maximum saves and shares (people bookmark actionable content)
- Written for SHORT-FORM first (TikTok, Reels, Shorts) then adapted for long-form

You think like Gary Vee's research + Alex Hormozi's specificity + @sina.growthtech's authenticity.`
};

class ScriptAgent extends BaseAgent {
  constructor() {
    super('script');
  }

  async execute(project, context) {
    this.log(`Writing script for: "${project.title}" [niche: ${project.niche}]`);

    const { researchData, trendData, viralFeedback } = context;
    const niche = project.niche || 'reckoning_files';
    const durationMinutes = Math.round(project.targetDuration / 60);
    const systemPrompt = SYSTEM_PROMPTS[niche] || SYSTEM_PROMPTS.reckoning_files;

    // Pull past viral hooks for this niche
    const viralHooks = await Memory.find({ type: 'viral_hook', niche })
      .sort({ viralScore: -1 })
      .limit(3)
      .lean();

    const hooksContext = viralHooks.length > 0
      ? `Past viral hooks that worked:\n${viralHooks.map(h => `"${h.content.hook}"`).join('\n')}`
      : '';

    // Get creator-modeled strategy for GrowthTech niche
    let creatorStrategy = null;
    if (niche === 'growth_tech') {
      creatorStrategy = await creatorIntelligence.generateCreatorModeledStrategy(
        project.concept, niche, project.targetDuration
      );
    }

    // Include viral feedback if this is a retry
    const feedbackContext = viralFeedback
      ? `PREVIOUS ATTEMPT FAILED VIRAL GATE. IMPROVEMENTS REQUIRED:\n${JSON.stringify(viralFeedback, null, 2)}`
      : '';

    const isGrowthTech = niche === 'growth_tech';

    const prompt = isGrowthTech
      ? this._buildGrowthTechPrompt(project, researchData, trendData, creatorStrategy, hooksContext, feedbackContext, durationMinutes)
      : this._buildReckoningPrompt(project, researchData, trendData, hooksContext, feedbackContext, durationMinutes);

    const scriptData = await this.claude.complete(systemPrompt, prompt, { maxTokens: 8192, jsonMode: true });
    if (creatorStrategy) scriptData.creatorStrategy = creatorStrategy;

    // Count words
    if (scriptData.fullScript) {
      scriptData.wordCount = scriptData.fullScript.split(/\s+/).length;
      scriptData.estimatedDuration = Math.round((scriptData.wordCount / 140) * 60);
    }

    return scriptData;
  }

  _buildReckoningPrompt(project, researchData, trendData, hooksContext, feedbackContext, durationMinutes) {
    return `Write a complete cinematic script for The Reckoning Files:

TITLE: ${project.title}
CONCEPT: ${project.concept}
DURATION: ${durationMinutes} minutes (approximately ${durationMinutes * 140} words)
RESEARCH: ${JSON.stringify(researchData || {}, null, 2)}
TREND DATA: ${JSON.stringify(trendData?.pacing || {}, null, 2)}
VIRAL HOOK FORMULA: ${JSON.stringify(trendData?.viralHookFormulas?.[0] || {})}

${hooksContext}
${feedbackContext}

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
  }

  _buildGrowthTechPrompt(project, researchData, trendData, creatorStrategy, hooksContext, feedbackContext, durationMinutes) {
    return `Write a viral GrowthTech business script modeled after @sina.growthtech's content style:

TITLE: ${project.title}
CONCEPT: ${project.concept}
DURATION: ${durationMinutes} minutes (approximately ${durationMinutes * 130} words)
RESEARCH: ${JSON.stringify(researchData || {}, null, 2)}
CREATOR STRATEGY: ${JSON.stringify(creatorStrategy || {}, null, 2)}

${hooksContext}
${feedbackContext}

REQUIREMENTS (@sina.growthtech style):
- Open with their EXACT hook formula: bold claim OR counter-intuitive insight OR specific result
- Tone: direct, raw, urgent — like texting a close friend who knows business
- Include SPECIFIC numbers, percentages, timelines (vague = no virality)
- Structure: Hook → Problem → Insight → Proof/Story → Actionable takeaway → CTA
- Every sentence earns the next — no filler, no fluff
- End with: a controversial opinion OR a question that divides the audience (drives comments)
- CTA: "Follow for more" in THEIR casual style, not corporate
- Include [TEXT OVERLAY: key stat or quote] for caption moments
- Include [BROLL: visual suggestion] for visual anchoring

Return as JSON:
{
  "hook": "Opening 10-15 seconds in @sina.growthtech voice — bold and direct",
  "hookFormula": "Which formula this uses",
  "actOne": "Problem/setup section",
  "actTwo": "Core insight + proof/story section",
  "actThree": "Actionable takeaway section",
  "callToAction": "CTA in their casual authentic style",
  "fullScript": "Complete script with [TEXT OVERLAY] and [BROLL] cues",
  "wordCount": 0,
  "estimatedDuration": 0,
  "keyLines": ["Most shareable/saveable lines"],
  "textOverlays": ["Key stat 1", "Key insight 2", "CTA text"],
  "controversialHook": "The opinion or question that will ignite comments",
  "emotionalBeats": [
    { "beat": "bold claim", "emotion": "curiosity/skepticism", "timestamp": "0:00" },
    { "beat": "proof moment", "emotion": "credibility/trust", "timestamp": "X:XX" },
    { "beat": "revelation", "emotion": "excitement/urgency", "timestamp": "X:XX" }
  ]
}`;
  }
}

module.exports = new ScriptAgent();
