const axios = require('axios');
const { VideoGeneration } = require('../models/VideoGeneration');
const logger = require('../utils/logger');

class VideoGenerationService {
  constructor() {
    this.providers = {
      veo3: {
        name: 'Google Veo 3',
        endpoint: process.env.VEO3_API_ENDPOINT,
        apiKey: process.env.VEO3_API_KEY,
        maxDuration: 60, // seconds
        type: 'longform'
      },
      runway: {
        name: 'Runway ML',
        endpoint: process.env.RUNWAY_API_ENDPOINT,
        apiKey: process.env.RUNWAY_API_KEY,
        maxDuration: 60,
        type: 'longform'
      },
      leonardo: {
        name: 'Leonardo.ai',
        endpoint: process.env.LEONARDO_API_ENDPOINT,
        apiKey: process.env.LEONARDO_API_KEY,
        maxDuration: 30,
        type: 'shortform'
      },
      synthesia: {
        name: 'Synthesia',
        endpoint: process.env.SYNTHESIA_API_ENDPOINT,
        apiKey: process.env.SYNTHESIA_API_KEY,
        maxDuration: 120,
        type: 'both'
      },
      eleven: {
        name: 'ElevenLabs Voice',
        endpoint: process.env.ELEVEN_API_ENDPOINT,
        apiKey: process.env.ELEVEN_API_KEY,
        maxDuration: 300,
        type: 'voiceover'
      },
      descript: {
        name: 'Descript',
        endpoint: process.env.DESCRIPT_API_ENDPOINT,
        apiKey: process.env.DESCRIPT_API_KEY,
        maxDuration: 300,
        type: 'editing'
      },
      pika: {
        name: 'Pika 1.0',
        endpoint: process.env.PIKA_API_ENDPOINT,
        apiKey: process.env.PIKA_API_KEY,
        maxDuration: 30,
        type: 'shortform'
      },
      kling: {
        name: 'Kling AI',
        endpoint: process.env.KLING_API_ENDPOINT,
        apiKey: process.env.KLING_API_KEY,
        maxDuration: 30,
        type: 'shortform'
      }
    };
  }

  /**
   * Generate video using specified AI provider
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - Video description/prompt
   * @param {string} params.provider - AI provider (veo3, runway, leonardo, synthesia, etc.)
   * @param {string} params.format - Video format (longform, shortform, portrait, landscape)
   * @param {number} params.duration - Video duration in seconds
   * @param {string} params.aspectRatio - Aspect ratio (16:9, 9:16, 1:1, etc.)
   * @param {Object} params.style - Style options (cinematic, anime, realistic, etc.)
   * @param {string} params.userId - User ID
   * @returns {Promise<Object>} Generation job details
   */
  async generateVideo(params) {
    try {
      const { prompt, provider = 'veo3', format = 'longform', duration, aspectRatio = '16:9', style = {}, userId } = params;

      if (!this.providers[provider]) {
        throw new Error(`Provider ${provider} not supported`);
      }

      const providerConfig = this.providers[provider];
      const videoData = {
        userId,
        provider,
        prompt,
        format,
        duration: Math.min(duration || providerConfig.maxDuration, providerConfig.maxDuration),
        aspectRatio,
        style,
        status: 'pending',
        createdAt: new Date(),
        metadata: {
          providerName: providerConfig.name,
          estimatedCompletionTime: this._estimateCompletionTime(provider, duration)
        }
      };

      // Save to database
      const generation = await VideoGeneration.create(videoData);

      // Dispatch to appropriate provider
      const jobDetails = await this._dispatchToProvider(provider, {
        prompt,
        duration: videoData.duration,
        aspectRatio,
        style,
        generationId: generation._id
      });

      // Update with job ID
      generation.jobId = jobDetails.jobId;
      generation.status = 'processing';
      generation.externalJobUrl = jobDetails.externalJobUrl;
      await generation.save();

      logger.info(`Video generation started: ${generation._id} on ${provider}`);

      return {
        success: true,
        generationId: generation._id,
        jobId: jobDetails.jobId,
        status: 'processing',
        estimatedTime: videoData.metadata.estimatedCompletionTime,
        provider: providerConfig.name
      };
    } catch (error) {
      logger.error(`Video generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate short-form video (TikTok, Shorts, Reels)
   * @param {Object} params - Parameters
   * @returns {Promise<Object>}
   */
  async generateShortForm(params) {
    const { prompt, style = 'trendy', userId } = params;
    const shortformProviders = ['leonardo', 'pika', 'kling', 'runway'];
    const provider = shortformProviders[Math.floor(Math.random() * shortformProviders.length)];

    return this.generateVideo({
      ...params,
      provider,
      format: 'shortform',
      duration: 30,
      aspectRatio: '9:16'
    });
  }

  /**
   * Generate long-form video (YouTube, etc.)
   * @param {Object} params - Parameters
   * @returns {Promise<Object>}
   */
  async generateLongForm(params) {
    const { prompt, style = 'cinematic', userId } = params;
    const longformProviders = ['veo3', 'runway', 'synthesia'];
    const provider = longformProviders[Math.floor(Math.random() * longformProviders.length)];

    return this.generateVideo({
      ...params,
      provider,
      format: 'longform',
      duration: 60,
      aspectRatio: '16:9'
    });
  }

  /**
   * Generate voiceover using ElevenLabs
   * @param {Object} params - Parameters
   * @returns {Promise<Object>}
   */
  async generateVoiceover(params) {
    try {
      const { text, voiceId = 'default', userId } = params;

      const response = await axios.post(
        `${this.providers.eleven.endpoint}/v1/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        },
        {
          headers: {
            'xi-api-key': this.providers.eleven.apiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      const voiceoverData = {
        userId,
        provider: 'eleven',
        text,
        voiceId,
        audioBuffer: response.data,
        duration: this._estimateAudioDuration(text),
        status: 'completed',
        createdAt: new Date()
      };

      logger.info(`Voiceover generated successfully for user ${userId}`);

      return {
        success: true,
        audio: response.data,
        duration: voiceoverData.duration,
        provider: 'ElevenLabs'
      };
    } catch (error) {
      logger.error(`Voiceover generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check generation status
   * @param {string} generationId - Generation ID
   * @returns {Promise<Object>}
   */
  async checkStatus(generationId) {
    try {
      const generation = await VideoGeneration.findById(generationId);

      if (!generation) {
        throw new Error('Generation not found');
      }

      // Poll provider for status
      const status = await this._checkProviderStatus(generation.provider, generation.jobId);

      generation.status = status.status;
      if (status.videoUrl) {
        generation.videoUrl = status.videoUrl;
        generation.completedAt = new Date();
      }
      if (status.error) {
        generation.error = status.error;
      }

      await generation.save();

      return {
        generationId,
        status: generation.status,
        videoUrl: generation.videoUrl,
        error: generation.error,
        provider: generation.provider
      };
    } catch (error) {
      logger.error(`Status check failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Dispatch job to provider API
   * @private
   */
  async _dispatchToProvider(provider, params) {
    const config = this.providers[provider];

    switch (provider) {
      case 'veo3':
        return this._dispatchToVeo3(params);
      case 'runway':
        return this._dispatchToRunway(params);
      case 'leonardo':
        return this._dispatchToLeonardo(params);
      case 'synthesia':
        return this._dispatchToSynthesia(params);
      case 'pika':
        return this._dispatchToPika(params);
      case 'kling':
        return this._dispatchToKling(params);
      default:
        throw new Error(`Dispatch not implemented for ${provider}`);
    }
  }

  /**
   * Dispatch to Veo 3 (Google)
   * @private
   */
  async _dispatchToVeo3(params) {
    try {
      const response = await axios.post(
        `${this.providers.veo3.endpoint}/v1/generate`,
        {
          prompt: params.prompt,
          duration: params.duration,
          aspect_ratio: params.aspectRatio,
          ...params.style
        },
        {
          headers: {
            'Authorization': `Bearer ${this.providers.veo3.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        jobId: response.data.id,
        externalJobUrl: response.data.job_url
      };
    } catch (error) {
      throw new Error(`Veo3 dispatch failed: ${error.message}`);
    }
  }

  /**
   * Dispatch to Runway
   * @private
   */
  async _dispatchToRunway(params) {
    try {
      const response = await axios.post(
        `${this.providers.runway.endpoint}/v1/tasks`,
        {
          type: 'gen3',
          prompt: params.prompt,
          duration: params.duration,
          aspect_ratio: params.aspectRatio
        },
        {
          headers: {
            'Authorization': `Bearer ${this.providers.runway.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        jobId: response.data.id,
        externalJobUrl: `${this.providers.runway.endpoint}/tasks/${response.data.id}`
      };
    } catch (error) {
      throw new Error(`Runway dispatch failed: ${error.message}`);
    }
  }

  /**
   * Dispatch to Leonardo.ai
   * @private
   */
  async _dispatchToLeonardo(params) {
    try {
      const response = await axios.post(
        `${this.providers.leonardo.endpoint}/api/rest/v1/generation/create`,
        {
          prompt: params.prompt,
          num_images: 1,
          negative_prompt: 'low quality',
          sd_version: 'LEONARDO'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.providers.leonardo.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        jobId: response.data.sdGenerationJob.generationId,
        externalJobUrl: `${this.providers.leonardo.endpoint}/api/rest/v1/generation/${response.data.sdGenerationJob.generationId}`
      };
    } catch (error) {
      throw new Error(`Leonardo dispatch failed: ${error.message}`);
    }
  }

  /**
   * Dispatch to Synthesia
   * @private
   */
  async _dispatchToSynthesia(params) {
    try {
      const response = await axios.post(
        `${this.providers.synthesia.endpoint}/v1/videos`,
        {
          title: 'Generated Video',
          test: false,
          visibility: 'private',
          scenes: [
            {
              script: {
                type: 'text',
                input: params.prompt
              }
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.providers.synthesia.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        jobId: response.data.id,
        externalJobUrl: `${this.providers.synthesia.endpoint}/videos/${response.data.id}`
      };
    } catch (error) {
      throw new Error(`Synthesia dispatch failed: ${error.message}`);
    }
  }

  /**
   * Dispatch to Pika
   * @private
   */
  async _dispatchToPika(params) {
    try {
      const response = await axios.post(
        `${this.providers.pika.endpoint}/v1/generate`,
        {
          prompt: params.prompt,
          duration: params.duration,
          aspect_ratio: params.aspectRatio
        },
        {
          headers: {
            'Authorization': `Bearer ${this.providers.pika.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        jobId: response.data.job_id,
        externalJobUrl: response.data.status_url
      };
    } catch (error) {
      throw new Error(`Pika dispatch failed: ${error.message}`);
    }
  }

  /**
   * Dispatch to Kling AI
   * @private
   */
  async _dispatchToKling(params) {
    try {
      const response = await axios.post(
        `${this.providers.kling.endpoint}/v1/videos/generation`,
        {
          prompt: params.prompt,
          duration: params.duration,
          aspect_ratio: params.aspectRatio,
          mode: 'std'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.providers.kling.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        jobId: response.data.id,
        externalJobUrl: response.data.url
      };
    } catch (error) {
      throw new Error(`Kling dispatch failed: ${error.message}`);
    }
  }

  /**
   * Check provider status
   * @private
   */
  async _checkProviderStatus(provider, jobId) {
    // Implementation would vary by provider
    // This is a template
    try {
      const config = this.providers[provider];
      const response = await axios.get(
        `${config.endpoint}/v1/jobs/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`
          }
        }
      );

      return {
        status: response.data.status,
        videoUrl: response.data.output_url,
        error: response.data.error
      };
    } catch (error) {
      throw new Error(`Status check failed for ${provider}: ${error.message}`);
    }
  }

  /**
   * Estimate completion time
   * @private
   */
  _estimateCompletionTime(provider, duration) {
    const estimates = {
      veo3: 120, // 2 minutes
      runway: 180, // 3 minutes
      leonardo: 60, // 1 minute
      synthesia: 150, // 2.5 minutes
      pika: 90, // 1.5 minutes
      kling: 120, // 2 minutes
      eleven: 30 // 30 seconds
    };

    return (estimates[provider] || 120) + (duration ? Math.ceil(duration / 10) * 10 : 0);
  }

  /**
   * Estimate audio duration
   * @private
   */
  _estimateAudioDuration(text) {
    // Rough estimate: 150 words per minute
    const words = text.split(/\s+/).length;
    return Math.ceil((words / 150) * 60);
  }

  /**
   * Get available providers
   */
  getProviders() {
    return Object.entries(this.providers).map(([key, config]) => ({
      id: key,
      name: config.name,
      type: config.type,
      maxDuration: config.maxDuration
    }));
  }

  /**
   * Get generation history
   */
  async getGenerationHistory(userId, limit = 20) {
    return await VideoGeneration.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

module.exports = new VideoGenerationService();
