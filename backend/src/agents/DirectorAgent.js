const BaseAgent = require('./base/BaseAgent');

const SYSTEM_PROMPT = `You are the Cinematic Director AI for Reckoning Studio AI — the creative intelligence
that thinks like Christopher Nolan, Denis Villeneuve, and David Fincher simultaneously, while
remaining completely original.

Your responsibilities:
- Camera angle decisions (with psychological intent)
- Lighting philosophy (emotion through light)
- Shot composition mastery (visual tension, balance, beauty)
- Lens selection (focal length as storytelling tool)
- Scene pacing (silence is a weapon)
- Emotional impact engineering

You direct AI-generated video, so your prompts must be PRECISE and SPECIFIC enough for AI models
to generate exactly what you envision. Every technical specification is an order.`;

class DirectorAgent extends BaseAgent {
  constructor() {
    super('director');
  }

  async execute(project, context) {
    this.log(`Directing scenes for: "${project.title}"`);

    const { storyboard } = context;

    if (!storyboard?.scenes) {
      throw new Error('Storyboard required for director agent');
    }

    const directedScenes = await Promise.all(
      storyboard.scenes.map(scene => this._directScene(project, scene, storyboard))
    );

    return {
      directorialVision: await this._generateVision(project, storyboard),
      directedScenes
    };
  }

  async _directScene(project, scene, storyboard) {
    const prompt = `As the Cinematic Director, refine and elevate this scene with precise directorial instructions:

PROJECT: ${project.title}
VISUAL STYLE: ${storyboard.visualStyle}
COLOR PALETTE: ${(storyboard.colorPalette || []).join(', ')}

SCENE ${scene.sceneNumber}: ${scene.title}
DURATION: ${scene.duration} seconds
MOOD: ${scene.mood}
NARRATIVE FUNCTION: ${scene.narrativeFunction}
CURRENT CAMERA: ${scene.cameraAngle}, ${scene.cameraMovement}
LOCATION: ${scene.location}
VISUAL DESCRIPTION: ${scene.visualDescription}

Provide directorial refinements as JSON:
{
  "sceneNumber": ${scene.sceneNumber},
  "directorsNote": "Your overall vision for this scene",
  "nolanInfluence": "How Christopher Nolan would approach this",
  "villeneuveInfluence": "How Denis Villeneuve would approach this",
  "fincherInfluence": "How David Fincher would approach this",
  "finalDecision": "Your unique directorial synthesis",
  "cameraSetup": {
    "angle": "${scene.cameraAngle}",
    "movement": "${scene.cameraMovement}",
    "focalLength": "${scene.focalLength || 'standard'}",
    "aperture": "f/1.8|f/2.8|f/4|f/8",
    "depthOfField": "shallow|medium|deep",
    "frameRate": "24fps|48fps|120fps_slowmo"
  },
  "lightingSetup": {
    "keyLight": "Position and quality",
    "fillLight": "Position and intensity",
    "backlight": "Rim light description",
    "practicals": "Any practical lights in scene",
    "colorTemperature": "warm|cool|mixed",
    "shadowPlay": "How shadows contribute to mood"
  },
  "composition": {
    "subjectPlacement": "Rule of thirds position",
    "leadingLines": "Visual elements that guide the eye",
    "symmetry": "symmetrical|asymmetrical|golden_ratio",
    "negativeSpace": "How empty space creates tension",
    "foregroundInterest": "What's in the foreground"
  },
  "pacing": {
    "cutRhythm": "fast|medium|slow|variable",
    "silenceMoments": "When to let silence speak",
    "emphasisTechnique": "freeze|zoom|smash_cut|slow_motion"
  },
  "refinedVideoPrompt": "The final AI video generation prompt incorporating all directorial decisions"
}`;

    return await this.claude.complete(SYSTEM_PROMPT, prompt, { jsonMode: true });
  }

  async _generateVision(project, storyboard) {
    const prompt = `Generate the overall directorial vision statement for this film:

TITLE: ${project.title}
VISUAL STYLE: ${storyboard.visualStyle}
TOTAL SCENES: ${storyboard.scenes?.length}
MUSIC MOOD MAP: ${storyboard.musicMoodMap}

Return as JSON:
{
  "vision": "One paragraph cinematic vision statement",
  "referenceFilms": ["Film 1 - why", "Film 2 - why"],
  "colorTheory": "How color tells the story",
  "motionPhilosophy": "Camera movement as emotional language",
  "lightingPhilosophy": "Light as narrative tool",
  "editingRhythm": "How cuts create emotion",
  "audienceExperience": "What the audience will FEEL, not just see"
}`;

    return await this.claude.complete(SYSTEM_PROMPT, prompt, { jsonMode: true });
  }
}

module.exports = new DirectorAgent();
