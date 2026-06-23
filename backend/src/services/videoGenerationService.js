const axios = require('axios');
const logger = require('../utils/logger');

class VideoGenerationService {
  constructor() {
    // All providers — maps to APIs shown in Artlist Studio + additional ones
    this.providers = {
      // --- SHORT FORM SPECIALISTS (best for TikTok/Reels/Shorts) ---
      kling_16: {
        name: 'Kling 1.6',
        endpoint: process.env.KLING_API_ENDPOINT || 'https://api.klingai.com',
        apiKey: process.env.KLING_API_KEY,
        maxDuration: 30,
        type: 'shortform',
        bestFor: ['tiktok', 'instagram_reels', 'youtube_shorts'],
        quality: 'high',
        speed: 'fast'
      },
      kling_21: {
        name: 'Kling 2.1',
        endpoint: process.env.KLING_API_ENDPOINT || 'https://api.klingai.com',
        apiKey: process.env.KLING_API_KEY,
        maxDuration: 30,
        type: 'shortform',
        bestFor: ['tiktok', 'instagram_reels', 'youtube_shorts'],
        quality: 'higher',
        speed: 'medium'
      },
      kling_25_turbo: {
        name: 'Kling 2.5 Turbo',
        endpoint: process.env.KLING_API_ENDPOINT || 'https://api.klingai.com',
        apiKey: process.env.KLING_API_KEY,
        maxDuration: 30,
        type: 'shortform',
        bestFor: ['tiktok', 'instagram_reels', 'youtube_shorts'],
        quality: 'highest',
        speed: 'fast'
      },
      ltx_23: {
        name: 'LTX 2.3 Pro',
        endpoint: process.env.LTX_API_ENDPOINT || 'https://api.ltx.studio',
        apiKey: process.env.LTX_API_KEY,
        maxDuration: 60,
        type: 'shortform',
        bestFor: ['tiktok', 'youtube_shorts', 'instagram_reels'],
        quality: 'high',
        speed: 'fast'
      },
      seedance: {
        name: 'Seedance 1.0 Pro Fast',
        endpoint: process.env.SEEDANCE_API_ENDPOINT || 'https://api.seedance.ai',
        apiKey: process.env.SEEDANCE_API_KEY,
        maxDuration: 60,
        type: 'shortform',
        bestFor: ['tiktok', 'instagram_reels'],
        quality: 'high',
        speed: 'very_fast'
      },
      pika: {
        name: 'Pika 2.0',
        endpoint: process.env.PIKA_API_ENDPOINT || 'https://api.pika.art',
        apiKey: process.env.PIKA_API_KEY,
        maxDuration: 30,
        type: 'shortform',
        bestFor: ['tiktok', 'youtube_shorts'],
        quality: 'high',
        speed: 'fast'
      },

      // --- LONG FORM / YOUTUBE SPECIALISTS ---
      veo3: {
        name: 'Veo 3.1 Lite',
        endpoint: process.env.VEO3_API_ENDPOINT || 'https://us-central1-aiplatform.googleapis.com/v1',
        apiKey: process.env.VEO3_API_KEY,
        maxDuration: 120,
        type: 'longform',
        bestFor: ['youtube'],
        quality: 'cinematic',
        speed: 'medium'
      },
      runway: {
        name: 'Runway Gen-4',
        endpoint: process.env.RUNWAY_API_ENDPOINT || 'https://api.runwayml.com',
        apiKey: process.env.RUNWAY_API_KEY,
        maxDuration: 120,
        type: 'longform',
        bestFor: ['youtube'],
        quality: 'cinematic',
        speed: 'medium'
      },
      heygen: {
        name: 'HeyGen Avatar',
        endpoint: process.env.HEYGEN_API_ENDPOINT || 'https://api.heygen.com',
        apiKey: process.env.HEYGEN_API_KEY,
        maxDuration: 900,
        type: 'both',
        bestFor: ['youtube', 'tiktok'],
        quality: 'avatar',
        speed: 'medium'
      },

      // --- VOICEOVER ---
      elevenlabs: {
        name: 'ElevenLabs Voice',
        endpoint: process.env.ELEVEN_API_ENDPOINT || 'https://api.elevenlabs.io',
        apiKey: process.env.ELEVEN_API_KEY,
        maxDuration: 900,
        type: 'voiceover',
        bestFor: ['all'],
        quality: 'ultra',
        speed: 'fast'
      }
    };

    // Recommended provider sets per platform
    this.platformDefaults = {
      youtube: ['veo3', 'runway', 'heygen'],
      tiktok: ['kling_25_turbo', 'seedance', 'ltx_23'],
      instagram_reels: ['kling_21', 'ltx_23', 'pika'],
      youtube_shorts: ['kling_16', 'ltx_23', 'seedance']
    };
  }

  // ----------------------------------------------------------------
  // PUBLIC METHODS
  // ----------------------------------------------------------------

  async generateVideo(params) {
    const {
      prompt,
      provider,
      format = 'longform',
      duration,
      aspectRatio = '16:9',
      style = {},
      platform = 'youtube',
      userId
    } = params;

    const resolvedProvider = provider || this._pickBestProvider(platform, format);

    if (!this.providers[resolvedProvider]) {
      throw new Error(`Provider "${resolvedProvider}" is not supported. Available: ${Object.keys(this.providers).join(', ')}`);
    }

    const config = this.providers[resolvedProvider];
    const resolvedDuration = Math.min(duration || config.maxDuration, config.maxDuration);

    logger.info(`Dispatching ${format} video to ${config.name} (${resolvedDuration}s) for ${platform}`);

    const jobDetails = await this._dispatchToProvider(resolvedProvider, {
      prompt,
      duration: resolvedDuration,
      aspectRatio: aspectRatio || this._aspectRatioForPlatform(platform),
      style,
      userId
    });

    return {
      success: true,
      jobId: jobDetails.jobId,
      provider: config.name,
      providerId: resolvedProvider,
      status: 'processing',
      estimatedTime: this._estimateTime(resolvedProvider, resolvedDuration),
      duration: resolvedDuration,
      platform,
      format,
      trackUrl: jobDetails.trackUrl
    };
  }

  async generateShortForm(params) {
    const platform = params.platform || 'tiktok';
    return this.generateVideo({
      ...params,
      format: 'shortform',
      duration: params.duration || 30,
      aspectRatio: '9:16',
      platform
    });
  }

  async generateLongForm(params) {
    const platform = params.platform || 'youtube';
    return this.generateVideo({
      ...params,
      format: 'longform',
      duration: params.duration || 60,
      aspectRatio: '16:9',
      platform
    });
  }

  async generateVoiceover(params) {
    const { text, voiceId = 'EXAVITQu4vr4xnSDxMaL', userId } = params;
    const config = this.providers.elevenlabs;

    if (!config.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await axios.post(
        `${config.endpoint}/v1/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        },
        {
          headers: { 'xi-api-key': config.apiKey, 'Content-Type': 'application/json' },
          responseType: 'arraybuffer'
        }
      );

      return {
        success: true,
        audio: Buffer.from(response.data).toString('base64'),
        mimeType: 'audio/mpeg',
        duration: this._estimateAudioDuration(text),
        provider: 'ElevenLabs'
      };
    } catch (error) {
      throw new Error(`Voiceover generation failed: ${error.message}`);
    }
  }

  async checkJobStatus(provider, jobId) {
    const config = this.providers[provider];
    if (!config) throw new Error(`Unknown provider: ${provider}`);

    try {
      // Each provider has a different status endpoint pattern
      const statusUrl = this._statusUrl(provider, jobId, config);
      const response = await axios.get(statusUrl, {
        headers: this._authHeaders(provider, config)
      });

      return this._normalizeStatus(provider, response.data);
    } catch (error) {
      throw new Error(`Status check failed for ${provider}: ${error.message}`);
    }
  }

  getProviders() {
    return Object.entries(this.providers).map(([id, cfg]) => ({
      id,
      name: cfg.name,
      type: cfg.type,
      maxDuration: cfg.maxDuration,
      maxDurationMinutes: Math.round(cfg.maxDuration / 60),
      bestFor: cfg.bestFor,
      quality: cfg.quality,
      speed: cfg.speed,
      isConfigured: !!cfg.apiKey
    }));
  }

  getProvidersForPlatform(platform) {
    const defaults = this.platformDefaults[platform] || this.platformDefaults.youtube;
    return this.getProviders().filter(p => defaults.includes(p.id));
  }

  // ----------------------------------------------------------------
  // PRIVATE METHODS
  // ----------------------------------------------------------------

  _pickBestProvider(platform, format) {
    const candidates = this.platformDefaults[platform] || this.platformDefaults.youtube;
    // Prefer first configured provider
    const configured = candidates.find(id => !!this.providers[id]?.apiKey);
    // Fall back to first in list even if not configured (dev mode)
    return configured || candidates[0];
  }

  _aspectRatioForPlatform(platform) {
    const map = {
      youtube: '16:9',
      tiktok: '9:16',
      instagram_reels: '9:16',
      youtube_shorts: '9:16'
    };
    return map[platform] || '16:9';
  }

  async _dispatchToProvider(provider, params) {
    switch (provider) {
      case 'kling_16':
      case 'kling_21':
      case 'kling_25_turbo':
        return this._dispatchKling(provider, params);
      case 'ltx_23':
        return this._dispatchLTX(params);
      case 'seedance':
        return this._dispatchSeedance(params);
      case 'veo3':
        return this._dispatchVeo3(params);
      case 'runway':
        return this._dispatchRunway(params);
      case 'heygen':
        return this._dispatchHeyGen(params);
      case 'pika':
        return this._dispatchPika(params);
      default:
        // Simulate a job for unconfigured providers in dev mode
        return this._simulateJob(provider, params);
    }
  }

  async _dispatchKling(provider, params) {
    const config = this.providers[provider];
    const modelMap = {
      kling_16: 'kling-v1.6',
      kling_21: 'kling-v2.1',
      kling_25_turbo: 'kling-v2.5-turbo'
    };

    try {
      const response = await axios.post(
        `${config.endpoint}/v1/videos/text2video`,
        {
          model_name: modelMap[provider],
          prompt: params.prompt,
          negative_prompt: 'low quality, blurry, distorted',
          cfg_scale: 0.5,
          mode: 'std',
          aspect_ratio: params.aspectRatio === '9:16' ? '9:16' : '16:9',
          duration: Math.min(params.duration, 10)
        },
        { headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' } }
      );

      return {
        jobId: response.data.data?.task_id || response.data.id,
        trackUrl: `${config.endpoint}/v1/videos/text2video/${response.data.data?.task_id}`
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') return this._simulateJob(provider, params);
      throw new Error(`Kling dispatch failed: ${error.message}`);
    }
  }

  async _dispatchLTX(params) {
    const config = this.providers.ltx_23;
    try {
      const response = await axios.post(
        `${config.endpoint}/v1/generate`,
        {
          prompt: params.prompt,
          negative_prompt: 'low quality, distorted',
          duration: params.duration,
          aspect_ratio: params.aspectRatio,
          model: 'ltx-video-2.3-pro'
        },
        { headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' } }
      );

      return { jobId: response.data.id, trackUrl: response.data.status_url };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') return this._simulateJob('ltx_23', params);
      throw new Error(`LTX dispatch failed: ${error.message}`);
    }
  }

  async _dispatchSeedance(params) {
    const config = this.providers.seedance;
    try {
      const response = await axios.post(
        `${config.endpoint}/v1/text2video`,
        {
          prompt: params.prompt,
          duration: params.duration,
          resolution: params.aspectRatio === '9:16' ? '720x1280' : '1280x720',
          model: 'seedance-1.0-pro'
        },
        { headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' } }
      );

      return { jobId: response.data.task_id, trackUrl: response.data.polling_url };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') return this._simulateJob('seedance', params);
      throw new Error(`Seedance dispatch failed: ${error.message}`);
    }
  }

  async _dispatchVeo3(params) {
    const config = this.providers.veo3;
    try {
      const response = await axios.post(
        `${config.endpoint}/v1/generate`,
        {
          prompt: params.prompt,
          duration_seconds: params.duration,
          aspect_ratio: params.aspectRatio,
          model: 'veo-3.1-lite'
        },
        { headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' } }
      );

      return { jobId: response.data.operation_id, trackUrl: response.data.operation_url };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') return this._simulateJob('veo3', params);
      throw new Error(`Veo3 dispatch failed: ${error.message}`);
    }
  }

  async _dispatchRunway(params) {
    const config = this.providers.runway;
    try {
      const response = await axios.post(
        `${config.endpoint}/v1/tasks`,
        {
          type: 'gen4_turbo',
          prompt: params.prompt,
          duration: params.duration,
          ratio: params.aspectRatio === '9:16' ? '768:1280' : '1280:768'
        },
        { headers: { 'Authorization': `Bearer ${config.apiKey}`, 'X-Runway-Version': '2024-11-06', 'Content-Type': 'application/json' } }
      );

      return { jobId: response.data.id, trackUrl: `${config.endpoint}/v1/tasks/${response.data.id}` };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') return this._simulateJob('runway', params);
      throw new Error(`Runway dispatch failed: ${error.message}`);
    }
  }

  async _dispatchHeyGen(params) {
    const config = this.providers.heygen;
    try {
      const response = await axios.post(
        `${config.endpoint}/v2/video/generate`,
        {
          video_inputs: [{
            character: { type: 'avatar', avatar_id: 'Daisy-inskirt-20220818', scale: 1 },
            voice: { type: 'text', input_text: params.prompt, voice_id: '2d5b0e6cf36f460aa7fc47e3eee4ba54' }
          }],
          dimension: { width: params.aspectRatio === '9:16' ? 720 : 1280, height: params.aspectRatio === '9:16' ? 1280 : 720 }
        },
        { headers: { 'X-Api-Key': config.apiKey, 'Content-Type': 'application/json' } }
      );

      return { jobId: response.data.data?.video_id, trackUrl: `${config.endpoint}/v1/video_status.get?video_id=${response.data.data?.video_id}` };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') return this._simulateJob('heygen', params);
      throw new Error(`HeyGen dispatch failed: ${error.message}`);
    }
  }

  async _dispatchPika(params) {
    const config = this.providers.pika;
    try {
      const response = await axios.post(
        `${config.endpoint}/v1/generate`,
        { prompt: params.prompt, duration: params.duration, aspect_ratio: params.aspectRatio },
        { headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' } }
      );

      return { jobId: response.data.job_id, trackUrl: response.data.status_url };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') return this._simulateJob('pika', params);
      throw new Error(`Pika dispatch failed: ${error.message}`);
    }
  }

  // Simulates a job in development when no API key is set
  _simulateJob(provider, params) {
    const fakeId = `dev_${provider}_${Date.now()}`;
    logger.info(`[DEV] Simulated job for ${provider}: ${fakeId}`);
    return { jobId: fakeId, trackUrl: `http://localhost:5000/api/video/dev-status/${fakeId}` };
  }

  _statusUrl(provider, jobId, config) {
    const urlMap = {
      kling_16: `${config.endpoint}/v1/videos/text2video/${jobId}`,
      kling_21: `${config.endpoint}/v1/videos/text2video/${jobId}`,
      kling_25_turbo: `${config.endpoint}/v1/videos/text2video/${jobId}`,
      ltx_23: `${config.endpoint}/v1/jobs/${jobId}`,
      seedance: `${config.endpoint}/v1/status/${jobId}`,
      veo3: `${config.endpoint}/v1/operations/${jobId}`,
      runway: `${config.endpoint}/v1/tasks/${jobId}`,
      heygen: `${config.endpoint}/v1/video_status.get?video_id=${jobId}`,
      pika: `${config.endpoint}/v1/job/${jobId}`
    };
    return urlMap[provider] || `${config.endpoint}/v1/status/${jobId}`;
  }

  _authHeaders(provider, config) {
    if (['heygen'].includes(provider)) return { 'X-Api-Key': config.apiKey };
    return { 'Authorization': `Bearer ${config.apiKey}` };
  }

  _normalizeStatus(provider, data) {
    // Normalize each provider's status format to a common shape
    const kling = ['kling_16', 'kling_21', 'kling_25_turbo'];
    if (kling.includes(provider)) {
      const task = data.data || data;
      return {
        status: task.task_status === 'succeed' ? 'completed' : task.task_status === 'failed' ? 'failed' : 'processing',
        videoUrl: task.task_result?.videos?.[0]?.url,
        error: task.task_status_msg
      };
    }
    if (provider === 'runway') {
      return {
        status: data.status === 'SUCCEEDED' ? 'completed' : data.status === 'FAILED' ? 'failed' : 'processing',
        videoUrl: data.output?.[0],
        error: data.failure
      };
    }
    if (provider === 'heygen') {
      return {
        status: data.data?.status === 'completed' ? 'completed' : data.data?.status === 'failed' ? 'failed' : 'processing',
        videoUrl: data.data?.video_url,
        error: data.data?.error
      };
    }
    // Default fallback
    return {
      status: data.status === 'completed' || data.status === 'done' ? 'completed' : 'processing',
      videoUrl: data.video_url || data.output_url || data.url,
      error: data.error
    };
  }

  _estimateTime(provider, duration) {
    const baseTimes = {
      kling_16: 60, kling_21: 90, kling_25_turbo: 45,
      ltx_23: 30, seedance: 25, pika: 45,
      veo3: 120, runway: 150, heygen: 300
    };
    return (baseTimes[provider] || 90) + Math.ceil(duration / 10) * 5;
  }

  _estimateAudioDuration(text) {
    return Math.ceil((text.split(/\s+/).length / 150) * 60);
  }
}

module.exports = new VideoGenerationService();
