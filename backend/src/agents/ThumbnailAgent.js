const BaseAgent = require('./base/BaseAgent');

const SYSTEM_PROMPT = `You are the Thumbnail Creator Agent for Reckoning Studio AI. You design
thumbnails that are proven to drive maximum click-through rates for The Reckoning Files channel.

You know that the best thumbnails for betrayal/revenge content:
- Feature extreme close-ups of faces with intense expressions
- Use high contrast (dark background, bright subject)
- Include 3-5 word text that creates a story gap
- Use red accents for danger/betrayal themes
- Create psychological tension before the viewer clicks

You design 3 thumbnail variants for A/B testing.`;

class ThumbnailAgent extends BaseAgent {
  constructor() {
    super('thumbnail');
  }

  async execute(project, context) {
    this.log(`Designing thumbnails for: "${project.title}"`);

    const { script, trendData, storyboard } = context;

    const thumbnailDesigns = await this._designThumbnails(project, script, trendData, storyboard);
    const imagePrompts = await this._generateImagePrompts(thumbnailDesigns, storyboard);

    return {
      designs: thumbnailDesigns,
      imagePrompts,
      abTestRecommendation: this._recommendABTest(thumbnailDesigns)
    };
  }

  async _designThumbnails(project, script, trendData, storyboard) {
    const prompt = `Design 3 high-converting thumbnail variants for this video:

TITLE: ${project.title}
CONCEPT: ${project.concept}
HOOK: ${script?.hook || ''}
OPTIMAL THUMBNAIL STYLE: ${trendData?.optimalThumbnailStyle || 'high contrast, intense expression'}
PROTAGONIST: ${storyboard?.protagonistDescription || ''}
COLOR PALETTE: ${(storyboard?.colorPalette || ['dark', 'red', 'white']).join(', ')}

Design 3 thumbnail variants as JSON:
{
  "variants": [
    {
      "variantId": "A",
      "concept": "Main thumbnail concept in one line",
      "layout": "description of visual layout",
      "subjectFocus": "What/who is the main visual focus",
      "expression": "exact facial expression or visual element",
      "textOverlay": {
        "mainText": "3-5 word text (creates story gap)",
        "subText": "optional subtitle",
        "textPosition": "top|bottom|left|right|center",
        "textColor": "#FFFFFF",
        "textStyle": "bold|outline|shadow"
      },
      "background": "background description",
      "colorScheme": {
        "dominant": "#000000",
        "accent": "#FF0000",
        "text": "#FFFFFF"
      },
      "emotions": ["shock", "betrayal", "intrigue"],
      "psychologicalTrigger": "Why this makes people click",
      "ctrPrediction": "high|very_high|extreme",
      "composition": "rule_of_thirds|centered|split_screen|close_up"
    }
  ],
  "universalElements": {
    "channelBranding": "How to incorporate channel identity",
    "consistencyNotes": "Visual elements consistent across variants"
  }
}`;

    return await this.claude.complete(SYSTEM_PROMPT, prompt, { jsonMode: true });
  }

  async _generateImagePrompts(designs, storyboard) {
    const variants = designs?.variants || [];

    const prompts = variants.map(variant => ({
      variantId: variant.variantId,
      midjourneyPrompt: `${variant.subjectFocus}, ${variant.expression}, ${variant.composition} composition, ${variant.colorScheme?.dominant} background, ${variant.colorScheme?.accent} accent lighting, dramatic cinematic lighting, 8K, photorealistic, YouTube thumbnail style --ar 16:9 --v 6`,
      dallePrompt: `Professional YouTube thumbnail: ${variant.subjectFocus} with ${variant.expression}. ${variant.background}. Color scheme: ${variant.colorScheme?.dominant} and ${variant.colorScheme?.accent}. High contrast, cinematic lighting. 1280x720 resolution.`,
      stableDiffusionPrompt: `(YouTube thumbnail:1.3), ${variant.subjectFocus}, ${variant.expression}, dramatic lighting, (${variant.colorScheme?.dominant} background:1.2), (${variant.colorScheme?.accent} accent:1.1), cinematic, 8k uhd, dslr, sharp focus, high quality`
    }));

    return prompts;
  }

  _recommendABTest(designs) {
    return {
      primaryTest: 'A vs B (first 24 hours)',
      secondaryTest: 'Winner vs C (next 48 hours)',
      metric: 'Click-through rate (target: >8%)',
      minimumImpressions: 1000
    };
  }
}

module.exports = new ThumbnailAgent();
