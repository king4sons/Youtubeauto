const BaseAgent = require('./base/BaseAgent');

const SYSTEM_PROMPT = `You are the AI Editing Agent for Reckoning Studio AI. You create the complete
editing plan that assembles individual video clips, voiceover, music, and sound effects into
a final cinematic production that maximizes audience retention.

You think like an editor who has cut:
- True crime documentaries (precision, evidence presentation)
- Psychological thrillers (tension through cutting rhythm)
- Epic historical content (grandeur and weight)

Your editing decisions are driven purely by data: watch time, retention, replays, shares, comments.
Every cut has a psychological purpose.`;

class EditingAgent extends BaseAgent {
  constructor() {
    super('editing');
  }

  async execute(project, context) {
    this.log(`Creating editing plan for: "${project.title}"`);

    const { storyboard, voiceData, musicData, videoJobs } = context;

    const editingPlan = await this._createEditingPlan(project, storyboard, voiceData, musicData);
    const retentionStrategy = await this._analyzeRetention(project, storyboard);

    return {
      editingPlan,
      retentionStrategy,
      assemblyInstructions: this._generateAssemblyInstructions(editingPlan, storyboard)
    };
  }

  async _createEditingPlan(project, storyboard, voiceData, musicData) {
    const scenes = storyboard?.scenes || [];

    const prompt = `Create a detailed editing plan that assembles all assets into a final cinematic production:

TITLE: ${project.title}
TOTAL DURATION: ${Math.round(project.targetDuration / 60)} minutes
SCENE COUNT: ${scenes.length}
VOICE SEGMENTS: ${voiceData?.segments?.length || 0}
MUSIC TIMELINE: ${JSON.stringify(musicData?.musicDesign?.musicTimeline?.slice(0, 3) || [])}

SCENES:
${scenes.map(s => `Scene ${s.sceneNumber}: ${s.title} (${s.duration}s) - ${s.mood} - transition: ${s.transitionOut}`).join('\n')}

Create editing plan as JSON:
{
  "timeline": [
    {
      "trackType": "video|audio_vo|audio_music|audio_sfx|text_overlay|broll",
      "clipId": "scene_1|vo_segment_1|music_track_1",
      "startTime": 0,
      "endTime": 30,
      "volume": 1.0,
      "transition": { "type": "cut|fade|dissolve|smash_cut|wipe", "duration": 0.3 },
      "effects": ["color_grade", "zoom_in", "vignette"],
      "textOverlay": null
    }
  ],
  "colorGradingPlan": {
    "globalLook": "Overall color grade description",
    "sceneAdjustments": [
      { "sceneNumber": 1, "grade": "cold blue desaturation", "lut": "suggested LUT" }
    ]
  },
  "retentionTechniques": [
    {
      "timestamp": 0,
      "technique": "hook|pattern_interrupt|tension_peak|emotional_beat|mystery_tease",
      "description": "What happens and why it retains viewers"
    }
  ],
  "deadSpaceRemovals": [
    { "originalStart": 0, "originalEnd": 5, "reason": "Slow intro — cut to action" }
  ],
  "brollInsertions": [
    { "atTimestamp": 0, "duration": 5, "brollDescription": "What B-roll to insert" }
  ],
  "cameraMovementEffects": [
    { "sceneNumber": 1, "effect": "Ken Burns slow zoom in", "direction": "in|out" }
  ],
  "paceAnalysis": {
    "avgCutInterval": 0,
    "fastestSection": "timestamp range",
    "slowestSection": "timestamp range",
    "dramaticPauses": ["timestamp list"]
  }
}`;

    return await this.claude.complete(SYSTEM_PROMPT, prompt, { maxTokens: 6144, jsonMode: true });
  }

  async _analyzeRetention(project, storyboard) {
    const scenes = storyboard?.scenes || [];

    const prompt = `Analyze this video for retention optimization:

TITLE: ${project.title}
DURATION: ${Math.round(project.targetDuration / 60)} minutes
SCENES: ${scenes.map(s => `${s.sceneNumber}: ${s.mood}`).join(', ')}

Identify retention risks and solutions as JSON:
{
  "retentionRisks": [
    { "timestamp": "X:XX", "risk": "description", "severity": "high|medium|low", "fix": "solution" }
  ],
  "hookStrength": { "score": 0, "analysis": "..." },
  "midpointRetention": { "score": 0, "technique": "..." },
  "endingStrength": { "score": 0, "callToAction": "..." },
  "estimatedRetentionCurve": [
    { "timePercent": 0, "retentionPercent": 100 },
    { "timePercent": 25, "retentionPercent": 85 },
    { "timePercent": 50, "retentionPercent": 70 },
    { "timePercent": 75, "retentionPercent": 65 },
    { "timePercent": 100, "retentionPercent": 55 }
  ],
  "optimizationPriority": ["Fix 1", "Fix 2", "Fix 3"]
}`;

    return await this.claude.complete(SYSTEM_PROMPT, prompt, { jsonMode: true });
  }

  _generateAssemblyInstructions(editingPlan, storyboard) {
    const scenes = storyboard?.scenes || [];
    return {
      totalTracks: 4, // video, vo, music, sfx
      exportSettings: {
        resolution: '1920x1080',
        fps: 24,
        codec: 'H.264',
        bitrate: '8000k',
        audioCodec: 'AAC',
        audioBitrate: '320k',
        format: 'MP4'
      },
      renderOrder: ['color_grade', 'assemble_video', 'mix_audio', 'add_effects', 'final_export'],
      qualityCheck: ['check_audio_sync', 'verify_transitions', 'confirm_color_grade', 'review_pacing']
    };
  }
}

module.exports = new EditingAgent();
