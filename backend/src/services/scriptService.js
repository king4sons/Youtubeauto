const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

class ScriptService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.model = 'claude-sonnet-4-6';
  }

  async generateScript(params) {
    const {
      topic,
      platform = 'youtube',
      contentType = 'longform',
      style = 'educational',
      targetAudience = 'general',
      duration
    } = params;

    const platformConfig = {
      youtube: { maxWords: 2000, hookStyle: 'engaging question or bold statement' },
      tiktok: { maxWords: 200, hookStyle: 'immediate hook in first 3 seconds' },
      instagram_reels: { maxWords: 250, hookStyle: 'visual hook with text overlay' },
      youtube_shorts: { maxWords: 200, hookStyle: 'fast paced opening' }
    };

    const durationMap = {
      shortform: '30-60 seconds',
      longform: '5-10 minutes',
      extended: '10-15 minutes'
    };

    const config = platformConfig[platform] || platformConfig.youtube;
    const targetDuration = duration || durationMap[contentType];

    const systemPrompt = `You are an expert YouTube and social media content creator and scriptwriter.
You create engaging, optimized scripts that perform well algorithmically and retain viewer attention.
Your scripts are structured with strong hooks, clear value delivery, and compelling calls-to-action.`;

    const userPrompt = `Create a ${targetDuration} ${style} script for ${platform} about: "${topic}"

Target Audience: ${targetAudience}
Content Type: ${contentType}
Platform: ${platform}

Return a JSON object with this exact structure:
{
  "title": "Catchy video title (under 70 chars)",
  "hook": "Opening line that grabs attention immediately (first 3-5 seconds)",
  "body": "Main script content with natural speaking rhythm. Use [PAUSE] for effect, [B-ROLL: description] for visual cues.",
  "callToAction": "Strong CTA at the end (subscribe, comment, follow, etc.)",
  "fullScript": "Complete script combining hook + body + CTA",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "seoTitle": "SEO-optimized title for the video",
  "seoDescription": "YouTube/platform description (2-3 paragraphs with keywords)",
  "seotags": ["tag1", "tag2"],
  "thumbnailPrompt": "Detailed prompt to generate a compelling thumbnail image",
  "videoPrompt": "Detailed visual/cinematic prompt for AI video generation based on the script content",
  "estimatedDuration": 300
}`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      });

      const content = response.content[0].text;

      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in script response');
      }

      const script = JSON.parse(jsonMatch[0]);
      logger.info(`Script generated for topic: "${topic}" (${platform})`);
      return script;
    } catch (error) {
      logger.error(`Script generation failed: ${error.message}`);
      throw new Error(`Script generation failed: ${error.message}`);
    }
  }

  async generateContentIdeas(params) {
    const { niche, platform = 'youtube', count = 10, style = 'educational' } = params;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `Generate ${count} trending content ideas for ${platform} in the ${niche} niche.
Style: ${style}

Return JSON array:
[
  {
    "title": "Video title",
    "hook": "Opening hook idea",
    "estimatedViews": "high/medium/low",
    "contentType": "shortform/longform",
    "tags": ["tag1", "tag2"]
  }
]`
        }]
      });

      const content = response.content[0].text;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found in ideas response');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error(`Idea generation failed: ${error.message}`);
      throw new Error(`Idea generation failed: ${error.message}`);
    }
  }

  async improveScript(script, feedback) {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `Improve this video script based on the feedback:

Original Script:
${script}

Feedback:
${feedback}

Return the improved script in the same JSON format as the original.`
        }]
      });

      const content = response.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in improved script response');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error(`Script improvement failed: ${error.message}`);
      throw new Error(`Script improvement failed: ${error.message}`);
    }
  }
}

module.exports = new ScriptService();
