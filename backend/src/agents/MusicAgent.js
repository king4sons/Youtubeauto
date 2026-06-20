const BaseAgent = require('./base/BaseAgent');

const SYSTEM_PROMPT = `You are the Music Engine Agent for Reckoning Studio AI. You design the complete
sonic landscape for cinematic videos — selecting, sequencing, and timing music tracks to maximize
emotional impact, retention, and virality.

You understand:
- Hans Zimmer's emotional architecture
- How music drives retention (the right track at the right moment)
- Tension and release cycles
- The psychological effect of silence
- How music signals to YouTube's algorithm (licensed vs. royalty-free)`;

const MUSIC_LIBRARY = {
  cinematic_dark: [
    { id: 'dark_001', name: 'Cold Reckoning', mood: 'menacing', tempo: 'slow', bpm: 60 },
    { id: 'dark_002', name: 'Calculated', mood: 'tense', tempo: 'medium', bpm: 80 },
    { id: 'dark_003', name: 'The Fall', mood: 'tragic', tempo: 'very_slow', bpm: 45 }
  ],
  orchestral_epic: [
    { id: 'epic_001', name: 'Justice Rising', mood: 'triumphant', tempo: 'fast', bpm: 120 },
    { id: 'epic_002', name: 'The Reckoning Hour', mood: 'powerful', tempo: 'medium', bpm: 90 },
    { id: 'epic_003', name: 'Final Judgment', mood: 'resolute', tempo: 'medium_fast', bpm: 100 }
  ],
  ambient_tension: [
    { id: 'amb_001', name: 'Silence Before Storm', mood: 'ominous', tempo: 'very_slow', bpm: 40 },
    { id: 'amb_002', name: 'Dread', mood: 'unsettling', tempo: 'slow', bpm: 55 },
    { id: 'amb_003', name: 'Clockwork', mood: 'calculated', tempo: 'medium', bpm: 75 }
  ]
};

class MusicAgent extends BaseAgent {
  constructor() {
    super('music');
  }

  async execute(project, context) {
    this.log(`Designing music landscape for: "${project.title}"`);

    const { storyboard, script, trendData } = context;

    const musicDesign = await this._designMusicArrangement(project, storyboard, script);

    return {
      musicDesign,
      trackList: this._selectTracks(musicDesign),
      soundDesignPlan: await this._designSoundEffects(project, storyboard)
    };
  }

  async _designMusicArrangement(project, storyboard, script) {
    const scenes = storyboard?.scenes || [];

    const prompt = `Design the complete music arrangement for this cinematic video:

TITLE: ${project.title}
DURATION: ${Math.round(project.targetDuration / 60)} minutes
EMOTIONAL ARC: ${storyboard?.musicMoodMap || 'dark opening → rising tension → climactic reckoning → resolute ending'}
SCENE COUNT: ${scenes.length}

KEY EMOTIONAL BEATS:
${scenes.map(s => `Scene ${s.sceneNumber}: ${s.mood} (${s.duration}s)`).join('\n')}

Design a complete music architecture as JSON:
{
  "overallGenre": "Primary genre",
  "moodJourney": "How music mood evolves across the video",
  "musicTimeline": [
    {
      "timeStart": 0,
      "timeEnd": 30,
      "trackType": "cinematic_dark|orchestral_epic|ambient_tension",
      "mood": "mood description",
      "volumeLevel": "0.0-1.0",
      "technique": "fade_in|full|fade_out|swell",
      "notes": "Why this music choice here"
    }
  ],
  "silenceMoments": [
    { "timeStart": 0, "duration": 3, "reason": "Why silence here" }
  ],
  "stingers": [
    { "time": 0, "type": "impact|reveal|clock_tick", "description": "..." }
  ],
  "musicVoiceoverBalance": {
    "musicVolumeDuringNarration": 0.15,
    "musicVolumeInBridges": 0.7,
    "ducking": true
  },
  "totalMusicTracks": 0,
  "licensingNotes": "All tracks should be royalty-free or licensed"
}`;

    return await this.claude.complete(SYSTEM_PROMPT, prompt, { jsonMode: true });
  }

  _selectTracks(musicDesign) {
    const timeline = musicDesign?.musicTimeline || [];
    const selected = [];

    for (const segment of timeline) {
      const library = MUSIC_LIBRARY[segment.trackType] || MUSIC_LIBRARY.cinematic_dark;
      const track = library.find(t => t.mood.includes(segment.mood?.split(' ')[0])) || library[0];

      if (track) {
        selected.push({
          ...track,
          timeStart: segment.timeStart,
          timeEnd: segment.timeEnd,
          volumeLevel: segment.volumeLevel,
          technique: segment.technique
        });
      }
    }

    return selected;
  }

  async _designSoundEffects(project, storyboard) {
    const scenes = storyboard?.scenes || [];

    const prompt = `Design sound effects and ambient audio for each scene:

PROJECT: ${project.title}

SCENES:
${scenes.map(s => `Scene ${s.sceneNumber}: ${s.title} - ${s.location} - ${s.mood}`).join('\n')}

Return as JSON:
{
  "ambientLayers": [
    {
      "sceneNumber": 1,
      "ambientSound": "description of room/environment sound",
      "volume": 0.1,
      "soundEffects": [
        { "effect": "description", "timing": "timestamp description", "impact": "high|medium|low" }
      ]
    }
  ],
  "globalSoundDesign": {
    "bassRumble": "When to use low-frequency tension",
    "heartbeat": "When to use heartbeat effect",
    "clockTicking": "When to use clock/time pressure",
    "silenceUse": "Strategic silence placement"
  }
}`;

    return await this.claude.complete(SYSTEM_PROMPT, prompt, { jsonMode: true });
  }
}

module.exports = new MusicAgent();
