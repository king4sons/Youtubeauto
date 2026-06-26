const axios = require('axios');
const logger = require('../utils/logger');

class ReplitConnector {
  constructor() {
    this.workerUrl = process.env.REPLIT_WORKER_URL || null;
    this.apiKey = process.env.WORKER_API_KEY || 'youtubeauto-worker-key';
    this._client = null;
  }

  get isConfigured() {
    return !!this.workerUrl;
  }

  _client_() {
    if (!this._client) {
      this._client = axios.create({
        baseURL: this.workerUrl,
        headers: {
          'X-Worker-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
    }
    return this._client;
  }

  // Reload config (e.g. after env change)
  reload() {
    this.workerUrl = process.env.REPLIT_WORKER_URL || null;
    this.apiKey = process.env.WORKER_API_KEY || 'youtubeauto-worker-key';
    this._client = null;
  }

  async ping() {
    if (!this.isConfigured) return { ok: false, reason: 'REPLIT_WORKER_URL not set' };
    try {
      const { data } = await this._client_().get('/api/worker/health');
      return { ok: true, ...data };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  async dispatch(params) {
    const { data } = await this._client_().post('/api/worker/jobs', params);
    logger.info(`[Replit] Job dispatched → ${data.jobId} (${params.provider})`);
    return {
      jobId: data.jobId,
      trackUrl: `${this.workerUrl}/api/worker/jobs/${data.jobId}`
    };
  }

  async getJobStatus(jobId) {
    const { data } = await this._client_().get(`/api/worker/jobs/${jobId}`);
    return {
      status: data.status,
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl,
      progress: data.progress,
      error: data.error,
      provider: data.provider
    };
  }

  async listJobs() {
    const { data } = await this._client_().get('/api/worker/jobs');
    return data;
  }

  async cancelJob(jobId) {
    const { data } = await this._client_().post(`/api/worker/jobs/${jobId}/cancel`);
    return data;
  }

  async getProviders() {
    const { data } = await this._client_().get('/api/worker/providers');
    return data;
  }
}

module.exports = new ReplitConnector();
