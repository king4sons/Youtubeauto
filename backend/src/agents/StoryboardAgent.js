const BaseAgent = require('./base/BaseAgent');
const { SCENE_DURATION_SECONDS } = require('../config/constants');

const SYSTEM_PROMPT = `You are the Storyboard Agent for Reckoning Studio AI. You transform scripts
into detailed visual storyboards — breaking stories into cinematic scenes with precise shot descriptions,
camera movements, visual moods, and timing.

You ensure:
- Character consistency across all scenes
- Location consistency
- Wardrobe consistency
- Lighting continuity
- Visual narrative flow

Think like a Hollywood storyboard artist working with a cinematographer.`;

class StoryboardAgent extends BaseAgent {
  constructor() {
    super('storyboard');
  }

  async execute(project, context) {
    this.log(`Building storyboard for: "${project.title}"`);

    const { script } = context;
    const durationMinutes = Math.round(project.targetDuration / 60);
    const sceneDurationTarget = SCENE_DURATION_SECONDS.MIN;

    // Calculate optimal scene count
    const estimatedScenes = Math.max(
      Math.ceil(project.targetDuration / sceneDurationTarget),
      Math.ceil(project.targetDuration / 120) // min 2-min scenes
    );

    const prompt = `Create a detailed cinematic storyboard for:

TITLE: ${project.title}
TOTAL DURATION: ${durationMinutes} minutes
SCRIPT HOOK: ${script?.hook || project.concept}
FULL SCRIPT EXCERPT: ${(script?.fullScript || project.concept).substring(0, 2000)}

TARGET SCENE COUNT: ${estimatedScenes} scenes
EACH SCENE: ${Math.round(project.targetDuration / estimatedScenes)} seconds average

Create a storyboard with exactly ${estimatedScenes} scenes in this JSON format:
{
  "visualStyle": "Overall visual aesthetic description",
  "colorPalette": ["primary color", "secondary color", "accent color"],
  "lightingStyle": "Overall lighting approach",
  "protagonistDescription": "Consistent visual description of protagonist",
  "antagonistDescription": "Consistent visual description of antagonist if present",
  "primaryLocations": [
    { "name": "Location name", "description": "Visual description", "mood": "..." }
  ],
  "wardrobeGuide": {
    "protagonist": "Consistent wardrobe description",
    "antagonist": "Consistent wardrobe description"
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Scene title",
      "scriptSegment": "Which part of script this covers",
      "duration": 60,
      "location": "Location name from primaryLocations",
      "timeOfDay": "day|night|golden_hour|blue_hour",
      "lighting": "Specific lighting setup",
      "mood": "Emotional tone of this scene",
      "cameraAngle": "extreme_close|close|medium|wide|aerial|dutch|POV",
      "cameraMovement": "static|pan|dolly|handheld|crane|tracking",
      "focalLength": "wide|standard|telephoto|macro",
      "shotComposition": "Rule of thirds position and framing notes",
      "visualDescription": "What the viewer sees in detail",
      "characters": ["protagonist", "antagonist"],
      "wardrobe": "What they're wearing this scene",
      "props": ["prop 1", "prop 2"],
      "colorGrading": "Post-processing look (e.g., desaturated blues, warm oranges)",
      "brollSuggestions": ["B-roll clip 1", "B-roll clip 2"],
      "transitionIn": "cut|fade|dissolve|smash_cut",
      "transitionOut": "cut|fade|dissolve|smash_cut",
      "soundDesign": "Ambient/sound effect notes",
      "narrativeFunction": "What this scene accomplishes in the story"
    }
  ],
  "transitionStyle": "Overall transition philosophy",
  "musicMoodMap": "How music should evolve across the video"
}`;

    const storyboard = await this.claude.complete(SYSTEM_PROMPT, prompt, { maxTokens: 8192, jsonMode: true });

    return storyboard;
  }
}

module.exports = new StoryboardAgent();
