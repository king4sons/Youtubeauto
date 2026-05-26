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
        maxDuration: 120, // seconds
        type: 'longform'
      },
      runway: {
        name: 'Runway ML',
        endpoint: process.env.RUNWAY_API_ENDPOINT,
        apiKey: process.env.RUNWAY_API_KEY,
        maxDuration: 120,
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
        maxDuration: 300,
        type: 'both'
      },
      eleven: {
        name: 'ElevenLabs Voice',
        endpoint: process.env.ELEVEN_API_ENDPOINT,
        apiKey: process.env.ELEVEN_API_KEY,
        maxDuration: 900, // 15 minutes
        type: 'voiceover'
      },
      descript: {
        name: 'Descript',
        endpoint: process.env.DESCRIPT_API_ENDPOINT,
        apiKey: process.env.DESCRIPT_API_KEY,
        maxDuration: 900,
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
      },
      heygen: {
        name: 'HeyGen',
        endpoint: process.env.HEYGEN_API_ENDPOINT,
        apiKey: process.env.HEYGEN_API_KEY,
        maxDuration: 900,
        type: 'longform'
      },
      fliki: {
        name: 'Fliki.ai',
        endpoint: process.env.FLIKI_API_ENDPOINT,
        apiKey: process.env.FLIKI_API_KEY,
        maxDuration: 900,
        type: 'longform'
      },
      invideo: {
        name: 'InVideo AI',
        endpoint: process.env.INVIDEO_API_ENDPOINT,
        apiKey: process.env.INVIDEO_API_KEY,
        maxDuration: 900,
        type: 'longform'
      }
    };
  }

  /**
   * Generate video using specified AI provider
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - Video description/prompt
   * @param {string} params.provider - AI provider (veo3, runway, leonardo, synthesia, etc.)
   * @param {string} params.format - Video format (longform, shortform, portrait, landscape, extended)
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
          estimatedCompletionTime: this._estimateCompletionTime(provider, duration),
          isExtendedForm: duration > 300
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
        generationId: generation._id,
        isExtendedForm: duration > 300
      });

      // Update with job ID
      generation.jobId = jobDetails.jobId;
      generation.status = 'processing';
      generation.externalJobUrl = jobDetails.externalJobUrl;
      await generation.save();

      logger.info(`Video generation started: ${generation._id} on ${provider} (${videoData.duration}s)`);

      return {
        success: true,
        generationId: generation._id,
        jobId: jobDetails.jobId,
        status: 'processing',
        estimatedTime: videoData.metadata.estimatedCompletionTime,
        provider: providerConfig.name,
        duration: videoData.duration
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
   * Generate extended/long-form video (10-15 minutes)
   * Perfect for YouTube, courses, documentaries, vlogs
   * @param {Object} params - Parameters
   * @returns {Promise<Object>}
   */
  async generateExtendedForm(params) {
    try {
      const { 
        prompt, 
        duration = 600, // Default 10 minutes
        style = 'documentary',
        userId,
        segments = [],
        autoGenerateSegments = false,
        includeVoiceover = false,
        includeMusic = false,
        musicGenre = 'cinematic'
      } = params;

      // Validate duration (10-15 minutes)
      if (duration < 600 || duration > 900) {
        throw new Error('Extended form duration must be between 10-15 minutes (600-900 seconds)');
      }

      // Extended form providers (support longer durations)
      const extendedFormProviders = ['synthesia', 'heygen', 'fliki', 'invideo', 'runway'];
      const provider = extendedFormProviders[Math.floor(Math.random() * extendedFormProviders.length)];

      let generatedSegments = segments;

      // Auto-generate segments if not provided
      if (autoGenerateSegments && (!segments || segments.length === 0)) {
        generatedSegments = await this._generateVideoSegments(prompt, duration);
      }

      const videoData = {
        userId,
        provider,
        prompt,
        format: 'extended',
        duration,
        aspectRatio: '16:9',
        style,
        status: 'pending',
        segments: generatedSegments,
        includeVoiceover,
        includeMusic,
        musicGenre,
        createdAt: new Date(),
        metadata: {
          providerName: this.providers[provider].name,
          estimatedCompletionTime: this._estimateCompletionTime(provider, duration),
          isExtendedForm: true,
          totalSegments: generatedSegments.length,
          durationMinutes: Math.round(duration / 60)
        }
      };

      // Save to database
      const generation = await VideoGeneration.create(videoData);

      // Dispatch to appropriate provider
      const jobDetails = await this._dispatchToProvider(provider, {
        prompt,
        duration,
        aspectRatio: '16:9',
        style,
        generationId: generation._id,
        isExtendedForm: true,
        segments: generatedSegments,
        includeVoiceover,
        includeMusic,
        musicGenre
      });

      // Update with job ID
      generation.jobId = jobDetails.jobId;
      generation.status = 'processing';
      generation.externalJobUrl = jobDetails.externalJobUrl;
      await generation.save();

      logger.info(`Extended form video generation started: ${generation._id} on ${provider} (${duration}s)`);

      return {
        success: true,
        generationId: generation._id,
        jobId: jobDetails.jobId,
        status: 'processing',
        estimatedTime: videoData.metadata.estimatedCompletionTime,
        provider: this.providers[provider].name,
        duration: videoData.metadata.durationMinutes,
        durationUnit: 'minutes',
        totalSegments: generatedSegments.length,
        format: 'Extended Form (10-15 minutes)'
      };
    } catch (error) {
      logger.error(`Extended form video generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate video segments for extended form content
   * @private
   */
  async _generateVideoSegments(prompt, totalDuration) {
    try {
      // Calculate segments (aim for 2-3 minute segments)
      const segmentDuration = 120; // 2 minutes per segment
      const numberOfSegments = Math.ceil(totalDuration / segmentDuration);

      // Create segments array
      const segments = [];
      for (let i = 0; i < numberOfSegments; i++) {
        const segmentPrompt = `${prompt} - Part ${i + 1} of ${numberOfSegments}`;
        segments.push({
          id: i + 1,
          title: `Segment ${i + 1}`,
          prompt: segmentPrompt,
          duration: Math.min(segmentDuration, totalDuration - (i * segmentDuration)),
          order: i + 1,
          status: 'pending'
        });
      }

      logger.info(`Generated ${numberOfSegments} video segments`);
      return segments;
    } catch (error) {
      logger.error(`Segment generation failed: ${error.message}`);
      throw error;
    }
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
        provider: generation.provider,
        format: generation.format,
        duration: generation.duration
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
      case 'heygen':
        return this._dispatchToHeyGen(params);
      case 'fliki':
        return this._dispatchToFliki(params);
      case 'invideo':
        return this._dispatchToInVideo(params);
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
          type: params.isExtendedForm ? 'gen3_extended' : 'gen3',
          prompt: params.prompt,
          duration: params.duration,
          aspect_ratio: params.aspectRatio,
          segments: params.segments
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
          title: params.isExtendedForm ? `Extended Video - ${params.generationId}` : 'Generated Video',
          test: false,
          visibility: 'private',
          duration: params.duration,
          scenes: params.isExtendedForm 
            ? params.segments.map((seg, idx) => ({
                script: {
                  type: 'text',
                  input: seg.prompt
                },
                order: idx
              }))
            : [{
                script: {
                  type: 'text',
                  input: params.prompt
                }
              }]
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
   * Dispatch to HeyGen
   * @private
   */
  async _dispatchToHeyGen(params) {
    try {
      const response = await axios.post(
        `${this.providers.heygen.endpoint}/v1/video_talks/generate`,
        {
          script: {
            type: 'text',
            input: params.prompt
          },
          duration: params.duration,
          avatar_id: 'default',
          voice_id: 'default'
        },
        {
          headers: {
            'X-API-Key': this.providers.heygen.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        jobId: response.data.video_id,
        externalJobUrl: `${this.providers.heygen.endpoint}/videos/${response.data.video_id}`
      };
    } catch (error) {
      throw new Error(`HeyGen dispatch failed: ${error.message}`);
    }
  }

  /**
   * Dispatch to Fliki.ai
   * @private
   */
  async _dispatchToFliki(params) {
    try {
      const response = await axios.post(
        `${this.providers.fliki.endpoint}/v1/video`,
        {
          script: params.prompt,
          aspect_ratio: params.aspectRatio === '16:9' ? 'widescreen' : 'portrait',
          duration: params.duration,
          background_music: params.includeMusic ? params.musicGenre : 'none'
        },
        {
          headers: {
            'X-API-Key': this.providers.fliki.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        jobId: response.data.request_id,
        externalJobUrl: `${this.providers.fliki.endpoint}/api/status/${response.data.request_id}`
      };
    } catch (error) {
      throw new Error(`Fliki dispatch failed: ${error.message}`);
    }
  }

  /**
   * Dispatch to InVideo AI
   * @private
   */
  async _dispatchToInVideo(params) {
    try {
      const response = await axios.post(
        `${this.providers.invideo.endpoint}/v1/template/render`,
        {
          title: `Video - ${params.generationId}`,
          description: params.prompt,
          content: params.prompt,
          duration: params.duration,
          template: params.isExtendedForm ? 'long_form' : 'standard',
          voice_over: params.includeVoiceover,
          music: params.includeMusic ? params.musicGenre : 'none'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.providers.invideo.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        jobId: response.data.render_id,
        externalJobUrl: `${this.providers.invideo.endpoint}/renders/${response.data.render_id}`
      };
    } catch (error) {
      throw new Error(`InVideo dispatch failed: ${error.message}`);
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
    const baseTimes = {
      veo3: 120, // 2 minutes
      runway: 180, // 3 minutes
      leonardo: 60, // 1 minute
      synthesia: 150, // 2.5 minutes
      pika: 90, // 1.5 minutes
      kling: 120, // 2 minutes
      heygen: 300, // 5 minutes
      fliki: 240, // 4 minutes
      invideo: 360, // 6 minutes
      eleven: 30 // 30 seconds
    };

    const baseTime = baseTimes[provider] || 120;
    
    // Extended form takes longer
    if (duration > 300) {
      return baseTime * 3 + (Math.ceil(duration / 60) * 30);
    }

    return baseTime + (duration ? Math.ceil(duration / 10) * 10 : 0);
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
      maxDuration: config.maxDuration,
      maxDurationMinutes: Math.round(config.maxDuration / 60)
    }));
  }

  /**
   * Get extended form providers (supports 10-15 minutes)
   */
  getExtendedFormProviders() {
    const extendedProviders = ['synthesia', 'heygen', 'fliki', 'invideo', 'runway'];
    return this.getProviders().filter(p => extendedProviders.includes(p.id));
  }

  /**
   * Generate video from a full screenplay/script
   * Parses chapter timestamps into segments and dispatches as extended form
   * @param {Object} params
   * @param {string} params.script - Full screenplay text
   * @param {string} params.title - Video title
   * @param {string} params.style - Visual style
   * @param {string} params.voiceId - ElevenLabs voice ID
   * @param {boolean} params.includeVoiceover - Whether to generate voiceover
   * @param {boolean} params.includeMusic - Whether to include background music
   * @param {string} params.musicGenre - Music genre
   * @param {string} params.userId
   * @returns {Promise<Object>}
   */
  async generateFromScript(params) {
    try {
      const {
        script,
        title = 'Generated Video',
        style = 'cinematic',
        userId,
        voiceId = 'default',
        includeVoiceover = true,
        includeMusic = true,
        musicGenre = 'cinematic'
      } = params;

      const { segments, totalDuration } = this._parseScript(script);

      if (segments.length === 0) {
        throw new Error('Could not parse any segments from the script. Ensure sections use the format: ## 0:00–0:22 — Chapter Title');
      }

      // Clamp to extended form range (10–15 min)
      const duration = Math.min(Math.max(totalDuration, 600), 900);

      const extendedFormProviders = ['synthesia', 'heygen', 'fliki', 'invideo'];
      const provider = extendedFormProviders[Math.floor(Math.random() * extendedFormProviders.length)];

      const videoData = {
        userId,
        provider,
        prompt: title,
        format: 'extended',
        duration,
        aspectRatio: '16:9',
        style,
        status: 'pending',
        segments,
        includeVoiceover,
        includeMusic,
        musicGenre,
        createdAt: new Date(),
        metadata: {
          providerName: this.providers[provider].name,
          estimatedCompletionTime: this._estimateCompletionTime(provider, duration),
          isExtendedForm: true,
          isScriptBased: true,
          totalSegments: segments.length,
          durationMinutes: Math.round(duration / 60),
          title
        }
      };

      const generation = await VideoGeneration.create(videoData);

      const jobDetails = await this._dispatchToProvider(provider, {
        prompt: title,
        duration,
        aspectRatio: '16:9',
        style,
        generationId: generation._id,
        isExtendedForm: true,
        segments,
        includeVoiceover,
        includeMusic,
        musicGenre,
        voiceId
      });

      generation.jobId = jobDetails.jobId;
      generation.status = 'processing';
      generation.externalJobUrl = jobDetails.externalJobUrl;
      await generation.save();

      logger.info(`Script-based video started: ${generation._id} on ${provider} (${duration}s, ${segments.length} segments)`);

      return {
        success: true,
        generationId: generation._id,
        jobId: jobDetails.jobId,
        status: 'processing',
        estimatedTime: videoData.metadata.estimatedCompletionTime,
        provider: this.providers[provider].name,
        duration: videoData.metadata.durationMinutes,
        durationUnit: 'minutes',
        totalSegments: segments.length,
        format: 'Script-Based Extended Form',
        title
      };
    } catch (error) {
      logger.error(`Script-based video generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse a screenplay into timed segments
   * Handles headers of the form: ## 0:00–0:22 — Chapter Title
   * @private
   */
  _parseScript(script) {
    const segments = [];
    // Match: ## M:SS–M:SS — Title  (supports – en-dash, — em-dash, or plain -)
    const sectionRegex = /##\s+(\d+):(\d+)\s*[–—-]+\s*(\d+):(\d+)\s*[—–-]+\s*(.+)/g;
    const matches = [...script.matchAll(sectionRegex)];

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const startSec = parseInt(m[1]) * 60 + parseInt(m[2]);
      const endSec   = parseInt(m[3]) * 60 + parseInt(m[4]);
      const chapterTitle = m[5].trim();

      const contentStart = m.index + m[0].length;
      const contentEnd   = i < matches.length - 1 ? matches[i + 1].index : script.length;
      const rawContent   = script.slice(contentStart, contentEnd);

      const visualMatch = rawContent.match(/\*\*Visual:\*\*\s*(.+)/);
      const musicMatch  = rawContent.match(/\*\*Music:\*\*\s*(.+)/);

      const dialogue = rawContent
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('**') && !l.startsWith('#') && l !== '***')
        .join(' ')
        .trim();

      segments.push({
        id: i + 1,
        title: chapterTitle,
        prompt: `${chapterTitle}: ${dialogue.slice(0, 500)}`,
        dialogue,
        visualDirection: visualMatch ? visualMatch[1].trim() : '',
        musicDirection: musicMatch  ? musicMatch[1].trim()  : '',
        startTime: startSec,
        endTime: endSec,
        duration: endSec - startSec,
        order: i + 1,
        status: 'pending'
      });
    }

    const totalDuration = segments.length > 0 ? segments[segments.length - 1].endTime : 0;
    return { segments, totalDuration };
  }

  /**
   * Get generation history
   */
  async getGenerationHistory(userId, limit = 20, format = null) {
    let query = { userId };
    if (format) {
      query.format = format;
    }

    return await VideoGeneration.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}

module.exports = new VideoGenerationService();
