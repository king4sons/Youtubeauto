const Content = require('../models/Content');
const scriptService = require('./scriptService');
const videoGenerationService = require('./videoGenerationService');
const logger = require('../utils/logger');

class ContentPipelineService {
  // Step 1: Create content from a topic (script generation)
  async createFromTopic(params) {
    const { topic, platform, contentType, style, targetAudience, userId } = params;

    // Generate script via Claude
    const script = await scriptService.generateScript({
      topic,
      platform,
      contentType,
      style,
      targetAudience
    });

    const content = await Content.create({
      userId,
      title: script.title,
      topic,
      platform,
      contentType,
      script: {
        hook: script.hook,
        body: script.body,
        callToAction: script.callToAction,
        fullScript: script.fullScript,
        keywords: script.keywords,
        estimatedDuration: script.estimatedDuration
      },
      video: {
        status: 'script_ready',
        prompt: script.videoPrompt,
        aspectRatio: this._aspectRatioForPlatform(platform),
        duration: script.estimatedDuration || this._defaultDuration(contentType)
      },
      seo: {
        title: script.seoTitle,
        description: script.seoDescription,
        tags: script.seotags,
        thumbnailPrompt: script.thumbnailPrompt
      }
    });

    logger.info(`Content created: ${content._id} — "${content.title}"`);

    return {
      success: true,
      contentId: content._id,
      title: content.title,
      script: content.script,
      seo: content.seo,
      videoPrompt: script.videoPrompt,
      status: 'script_ready'
    };
  }

  // Step 2: Generate video from existing content record
  async generateVideoForContent(contentId, params = {}) {
    const content = await Content.findById(contentId);
    if (!content) throw new Error('Content not found');

    const { provider, style } = params;

    const jobResult = await videoGenerationService.generateVideo({
      prompt: content.video.prompt || content.script.fullScript,
      provider,
      format: content.contentType,
      duration: content.video.duration,
      aspectRatio: content.video.aspectRatio,
      style: style || content.video.style,
      platform: content.platform,
      userId: content.userId
    });

    content.video.status = 'generating';
    content.video.provider = jobResult.providerId;
    content.video.jobId = jobResult.jobId;
    content.video.estimatedCompletionTime = jobResult.estimatedTime;
    await content.save();

    logger.info(`Video generation queued for content: ${contentId} (${jobResult.provider})`);

    return {
      success: true,
      contentId,
      jobId: jobResult.jobId,
      provider: jobResult.provider,
      estimatedTime: jobResult.estimatedTime,
      status: 'generating'
    };
  }

  // Step 3: Poll / sync video status
  async syncVideoStatus(contentId) {
    const content = await Content.findById(contentId);
    if (!content) throw new Error('Content not found');

    if (!content.video.jobId || !content.video.provider) {
      return { contentId, status: content.video.status };
    }

    if (content.video.status === 'completed') {
      return { contentId, status: 'completed', videoUrl: content.video.videoUrl };
    }

    const providerStatus = await videoGenerationService.checkJobStatus(
      content.video.provider,
      content.video.jobId
    );

    content.video.status = providerStatus.status;
    if (providerStatus.videoUrl) {
      content.video.videoUrl = providerStatus.videoUrl;
    }
    if (providerStatus.error) {
      content.video.error = providerStatus.error;
    }
    await content.save();

    return {
      contentId,
      status: content.video.status,
      videoUrl: content.video.videoUrl,
      error: content.video.error
    };
  }

  // Get all content for a user
  async getContentList(userId, filters = {}) {
    const query = { userId, ...filters };
    const items = await Content.find(query).sort({ createdAt: -1 }).limit(50);
    return items;
  }

  // Get single content item
  async getContent(contentId, userId) {
    const content = await Content.findOne({ _id: contentId, userId });
    if (!content) throw new Error('Content not found');
    return content;
  }

  // Update script or metadata
  async updateContent(contentId, userId, updates) {
    const content = await Content.findOneAndUpdate(
      { _id: contentId, userId },
      { $set: updates },
      { new: true }
    );
    if (!content) throw new Error('Content not found');
    return content;
  }

  // Delete content
  async deleteContent(contentId, userId) {
    const result = await Content.findOneAndDelete({ _id: contentId, userId });
    if (!result) throw new Error('Content not found');
    return { success: true };
  }

  // Generate ideas
  async generateIdeas(params) {
    return scriptService.generateContentIdeas(params);
  }

  _aspectRatioForPlatform(platform) {
    return ['tiktok', 'instagram_reels', 'youtube_shorts'].includes(platform) ? '9:16' : '16:9';
  }

  _defaultDuration(contentType) {
    return { shortform: 30, longform: 60, extended: 600 }[contentType] || 60;
  }
}

module.exports = new ContentPipelineService();
