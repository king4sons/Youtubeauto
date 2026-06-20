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

You think like Gary Vee's research + Alex Hormozi's specificity + @sina.growthtech's authenticity.`,

  ai_education: `You are the Script Writer for Reckoning Studio AI — an AI education specialist who writes
in the live-demo, show-don't-tell style of @kevin.dink.ai and top AI educators on TikTok.

Your scripts are:
- Enthusiastic but grounded — excited about a real result you just achieved
- Structured around DEMONSTRATION: show the result first, then explain how
- Packed with specific tool names, prices, commands, and workflow steps
- Optimized for saves — every line must be worth writing down or bookmarking
- Written as if you're a friend who just discovered something incredible and can't wait to share
- Screen-recording aware: narrate what's on screen with precise visual cues
- [SCREEN: what to show] cues for every major visual moment

Your viral signature: the near 1:1 save-to-like ratio of reference-worthy tutorial content.
You think like Kevin Dink AI building live + MrBeast's visual pacing + Ali Abdaal's actionable teaching.`
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

    // Get creator-modeled strategy for creator-modeled niches
    let creatorStrategy = null;
    if (niche === 'growth_tech' || niche === 'ai_education') {
      creatorStrategy = await creatorIntelligence.generateCreatorModeledStrategy(
        project.concept, niche, project.targetDuration
      );
    }

    // Include viral feedback if this is a retry
    const feedbackContext = viralFeedback
      ? `PREVIOUS ATTEMPT FAILED VIRAL GATE. IMPROVEMENTS REQUIRED:\n${JSON.stringify(viralFeedback, null, 2)}`
      : '';

    let prompt;
    if (niche === 'growth_tech') {
      prompt = this._buildGrowthTechPrompt(project, researchData, trendData, creatorStrategy, hooksContext, feedbackContext, durationMinutes);
    } else if (niche === 'ai_education') {
      prompt = this._buildAIEduPrompt(project, researchData, trendData, creatorStrategy, hooksContext, feedbackContext, durationMinutes);
    } else {
      prompt = this._buildReckoningPrompt(project, researchData, trendData, hooksContext, feedbackContext, durationMinutes);
    }

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

  _buildAIEduPrompt(project, researchData, trendData, creatorStrategy, hooksContext, feedbackContext, durationMinutes) {
    return `Write a viral AI Education script modeled after @kevin.dink.ai's live-build content style:

TITLE: ${project.title}
CONCEPT: ${project.concept}
DURATION: ${durationMinutes} minutes (approximately ${durationMinutes * 130} words)
RESEARCH: ${JSON.stringify(researchData || {}, null, 2)}
CREATOR STRATEGY: ${JSON.stringify(creatorStrategy || {}, null, 2)}

${hooksContext}
${feedbackContext}

REQUIREMENTS (@kevin.dink.ai style):
- Open by SHOWING THE RESULT FIRST — the incredible thing they built before explaining how
- Narrate as if you're screen-sharing live and walking someone through step by step
- Include SPECIFIC tool names, prices, exact steps, commands (reference-worthy = saves)
- Structure: Result Hook → Problem/Pain → Tool Introduction → Live Demo Steps → Result Proof → CTA
- Every step must be concrete enough to follow immediately (vague = no saves)
- Include [SCREEN: what's visible on screen] cues throughout
- Include [ZOOM IN: highlight this element] for key moments
- Include [TEXT OVERLAY: key stat/tool/price] for caption moments
- End CTA: casual follow prompt focused on what comes next in the build
- Tone: enthusiastic discoverer, not corporate instructor

Return as JSON:
{
  "hook": "Opening 10-15 seconds — show the result first, then 'let me show you how'",
  "hookFormula": "Which formula (result-first / price-shock / tool-reveal / live-demo)",
  "actOne": "Problem setup + tool introduction — why this matters",
  "actTwo": "Live demo narration — step-by-step with SCREEN cues",
  "actThree": "Result proof + what they can now build themselves",
  "callToAction": "Follow CTA teasing what gets built next",
  "fullScript": "Complete script with [SCREEN], [ZOOM IN], [TEXT OVERLAY] cues",
  "wordCount": 0,
  "estimatedDuration": 0,
  "keyLines": ["Most bookmark-worthy lines — specific steps or prices"],
  "textOverlays": ["Tool name + price", "Step 1: ...", "Step 2: ...", "Result: ..."],
  "screenCues": ["Screen 1: VS Code open at...", "Screen 2: Browser showing..."],
  "saveHook": "The single line that makes people save this video to watch later",
  "commentHook": "The question that makes people comment their experience",
  "emotionalBeats": [
    { "beat": "result reveal", "emotion": "amazement/FOMO", "timestamp": "0:00" },
    { "beat": "demo moment", "emotion": "following-along excitement", "timestamp": "X:XX" },
    { "beat": "it works", "emotion": "satisfaction/motivation", "timestamp": "X:XX" }
  ]
}`;
  }
}

module.exports = new ScriptAgent();
