const BaseAgent = require('./base/BaseAgent');
const logger = require('../utils/logger');

const SYSTEM_PROMPT = `You are the Publishing Agent for Reckoning Studio AI. You coordinate
the scheduling and publishing of videos across YouTube, TikTok, Instagram Reels, Facebook,
and YouTube Shorts — maximizing reach through optimal timing and cross-platform strategy.`;

class PublishingAgent extends BaseAgent {
  constructor() {
    super('publishing');
  }

  async execute(project, context) {
    this.log(`Planning publishing for: "${project.title}"`);

    const { seoData } = context;

    const publishingPlan = await this._createPublishingPlan(project, seoData);

    return publishingPlan;
  }

  async _createPublishingPlan(project, seoData) {
    const platforms = project.targetPlatforms || ['youtube'];

    const prompt = `Create an optimal publishing strategy for this video:

TITLE: ${project.title}
DURATION: ${Math.round(project.targetDuration / 60)} minutes
PLATFORMS: ${platforms.join(', ')}
SEO DATA: ${JSON.stringify(seoData?.youtube || {}, null, 2)}

Return publishing plan as JSON:
{
  "primaryPlatform": "youtube",
  "publishSchedule": [
    {
      "platform": "youtube",
      "scheduledTime": "ISO timestamp or 'immediately'",
      "timezone": "EST",
      "dayOfWeek": "Saturday",
      "time": "10:00 AM",
      "reasoning": "Why this time"
    }
  ],
  "crossPostingStrategy": {
    "youtubeShorts": "Whether/how to cut a Shorts version",
    "tiktok": "TikTok clip strategy",
    "instagram": "Instagram Reels strategy",
    "facebook": "Facebook strategy"
  },
  "promotionPlan": {
    "preLaunch": ["24h before: community post", "1h before: story"],
    "atLaunch": ["pin comment", "share to community"],
    "postLaunch": ["respond to first 50 comments", "share milestone at 10k views"]
  },
  "engagementStrategy": {
    "firstHour": "What to do in first hour after publish",
    "first24Hours": "Activity in first 24 hours",
    "commentResponsePlan": "How to respond to comments"
  },
  "monetizationStatus": {
    "adReady": true,
    "sponsorshipSlots": ["midroll at X:XX"],
    "affiliateOpportunities": []
  }
}`;

    return await this.claude.complete(SYSTEM_PROMPT, prompt, { jsonMode: true });
  }

  async publish(project, publishingPlan) {
    // Platform-specific publishing (requires OAuth tokens)
    const results = [];

    for (const schedule of (publishingPlan.publishSchedule || [])) {
      try {
        const result = await this._publishToPlatform(project, schedule.platform, publishingPlan);
        results.push({ platform: schedule.platform, success: true, ...result });
      } catch (error) {
        logger.error(`Publishing to ${schedule.platform} failed: ${error.message}`);
        results.push({ platform: schedule.platform, success: false, error: error.message });
      }
    }

    return results;
  }

  async _publishToPlatform(project, platform, plan) {
    // Placeholder — actual OAuth publishing implementation
    logger.info(`[PublishingAgent] Queued ${platform} publish for project ${project._id}`);
    return {
      status: 'scheduled',
      message: `Queued for ${platform} publishing. Requires OAuth credentials.`
    };
  }
}

module.exports = new PublishingAgent();
