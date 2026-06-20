const BaseAgent = require('./base/BaseAgent');

const SYSTEM_PROMPT = `You are the SEO Agent for Reckoning Studio AI. You craft YouTube and social media
metadata that maximizes discoverability, watch time, and subscriber conversion.

You understand:
- YouTube's search and recommendation algorithm
- Keyword research for viral content niches
- Title formulas that drive clicks AND satisfy the algorithm
- Description optimization for both humans and search
- Tag strategies for maximum reach
- Community post strategy for engagement`;

class SEOAgent extends BaseAgent {
  constructor() {
    super('seo');
  }

  async execute(project, context) {
    this.log(`Optimizing SEO for: "${project.title}"`);

    const { script, trendData, thumbnailData } = context;

    const seoPackage = await this._generateSEOPackage(project, script, trendData, thumbnailData);

    return seoPackage;
  }

  async _generateSEOPackage(project, script, trendData, thumbnailData) {
    const prompt = `Create a complete SEO package for this video:

TITLE: ${project.title}
CONCEPT: ${project.concept}
HOOK: ${script?.hook || ''}
TRENDING KEYWORDS: ${(trendData?.trendingKeywords || []).join(', ')}
DURATION: ${Math.round(project.targetDuration / 60)} minutes
PLATFORMS: ${(project.targetPlatforms || ['youtube']).join(', ')}

Generate a complete SEO package as JSON:
{
  "youtube": {
    "titleVariants": [
      { "title": "Primary title", "characterCount": 0, "clickPrediction": "high" },
      { "title": "A/B test title 1", "characterCount": 0, "clickPrediction": "medium" },
      { "title": "A/B test title 2", "characterCount": 0, "clickPrediction": "high" }
    ],
    "selectedTitle": "The best title",
    "description": {
      "hook": "First 2 lines (visible without expanding)",
      "timestamps": ["00:00 - Opening Hook", "01:30 - The Setup", "05:00 - The Betrayal", "10:00 - The Reckoning"],
      "body": "Full description body (400-500 words)",
      "socialLinks": "Placeholder for social links",
      "keywords": "Embedded keywords naturally",
      "callToAction": "Subscribe for more reckoning stories"
    },
    "tags": ["tag1", "tag2", "tag3"],
    "category": "22",
    "language": "en",
    "madeForKids": false,
    "chapters": [
      { "time": "00:00", "title": "Chapter title" }
    ],
    "cards": [
      { "time": "X:XX", "type": "video|playlist|link", "description": "..." }
    ],
    "endScreen": {
      "video1": "Best performing video description",
      "video2": "Most recent video",
      "subscribeButton": true
    },
    "pinnedComment": "First comment to pin for engagement",
    "communityPost": "Post to publish 24h before video"
  },
  "tiktok": {
    "caption": "TikTok caption with hooks (150 chars max)",
    "hashtags": ["#hashtag1", "#hashtag2"],
    "sound": "Trending sound recommendation"
  },
  "instagram": {
    "caption": "Instagram caption",
    "hashtags": ["#hashtag1"],
    "reelCover": "What the reel cover should show"
  },
  "keywordStrategy": {
    "primaryKeyword": "Main search term",
    "secondaryKeywords": ["keyword 1", "keyword 2"],
    "longTailKeywords": ["long tail 1", "long tail 2"],
    "searchVolume": "estimated monthly searches",
    "competition": "low|medium|high"
  },
  "thumbnailText": "Final thumbnail text recommendation",
  "uploadChecklist": ["item 1", "item 2", "item 3"]
}`;

    return await this.claude.complete(SYSTEM_PROMPT, prompt, { maxTokens: 4096, jsonMode: true });
  }
}

module.exports = new SEOAgent();
