const BaseAgent = require('./base/BaseAgent');

const SYSTEM_PROMPT = `You are the Prompt Engineer Agent for Reckoning Studio AI. You transform
directorial visions and storyboard scenes into precision AI video generation prompts.

You know exactly how to craft prompts for:
- Google Veo 3 (natural language, cinematic descriptors)
- Runway Gen-3 (technical cinematography language)
- Pika (motion-focused prompts)
- Kling AI (detailed scene composition)
- Luma AI (3D scene description)

Your prompts ALWAYS maintain:
- Character consistency (same person across scenes)
- Location consistency (same environment)
- Wardrobe consistency
- Lighting continuity
- Cinematic quality

Every prompt is a precise production order, not a suggestion.`;

class PromptEngineerAgent extends BaseAgent {
  constructor() {
    super('prompt_engineer');
  }

  async execute(project, context) {
    this.log(`Engineering prompts for: "${project.title}"`);

    const { storyboard, directorData } = context;
    const scenes = storyboard?.scenes || [];
    const directedScenes = directorData?.directedScenes || [];

    // Build consistency anchors
    const consistencyAnchors = {
      protagonist: storyboard?.protagonistDescription || '',
      antagonist: storyboard?.antagonistDescription || '',
      colorPalette: (storyboard?.colorPalette || []).join(', '),
      lightingStyle: storyboard?.lightingStyle || 'cinematic',
      visualStyle: storyboard?.visualStyle || 'cinematic realism'
    };

    const engineeredPrompts = await Promise.all(
      scenes.map((scene, index) => this._engineerPrompt(
        project,
        scene,
        directedScenes[index] || {},
        consistencyAnchors
      ))
    );

    return {
      consistencyAnchors,
      prompts: engineeredPrompts
    };
  }

  async _engineerPrompt(project, scene, directorData, anchors) {
    const prompt = `Engineer the optimal AI video generation prompt for this scene:

PROJECT CONSISTENCY:
- Protagonist: ${anchors.protagonist}
- Color Palette: ${anchors.colorPalette}
- Lighting Style: ${anchors.lightingStyle}
- Visual Style: ${anchors.visualStyle}

SCENE ${scene.sceneNumber}: ${scene.title}
DURATION: ${scene.duration} seconds
MOOD: ${scene.mood}
LOCATION: ${scene.location}
TIME: ${scene.timeOfDay}
CAMERA: ${scene.cameraAngle}, ${scene.cameraMovement}
LIGHTING: ${scene.lighting}
VISUAL: ${scene.visualDescription}
COLOR GRADE: ${scene.colorGrading}
DIRECTOR'S FINAL PROMPT: ${directorData?.refinedVideoPrompt || ''}

Generate optimized prompts for each AI provider as JSON:
{
  "sceneNumber": ${scene.sceneNumber},
  "masterPrompt": "The universal prompt that captures the full scene vision",
  "veo3Prompt": "Google Veo 3 optimized prompt (natural language, cinematic)",
  "runwayPrompt": "Runway Gen-3 optimized prompt (technical cinematography)",
  "pikaPrompt": "Pika optimized prompt (motion and style focused)",
  "klingPrompt": "Kling AI optimized prompt (composition focused)",
  "negativePrompt": "What to avoid: blurry, low quality, inconsistent characters, shaky cam, watermarks",
  "technicalSpecs": {
    "duration": ${scene.duration},
    "aspectRatio": "${project.aspectRatio || '16:9'}",
    "fps": 24,
    "resolution": "1920x1080",
    "motionIntensity": "subtle|moderate|dynamic"
  },
  "consistencyNotes": "Notes for maintaining consistency with other scenes",
  "characterReferences": "How to maintain character consistency",
  "seedSuggestion": "Consistent seed for character/style lock"
}`;

    return await this.claude.complete(SYSTEM_PROMPT, prompt, { jsonMode: true });
  }
}

module.exports = new PromptEngineerAgent();
