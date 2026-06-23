import React, { useState, useEffect } from 'react';
import api from '../api';

const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 Widescreen (YouTube)' },
  { value: '9:16', label: '9:16 Vertical (TikTok/Reels/Shorts)' },
  { value: '1:1', label: '1:1 Square' }
];

export default function VideoStudio() {
  const [providers, setProviders] = useState([]);
  const [form, setForm] = useState({
    prompt: '',
    provider: '',
    aspectRatio: '16:9',
    duration: 30,
    platform: 'youtube',
    format: 'shortform'
  });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('generate');

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const res = await api.get('/api/video/providers');
      const data = res.data.data || [];
      setProviders(data);
      if (data.length > 0) setForm(f => ({ ...f, provider: data[0].id }));
    } catch {}
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.prompt.trim()) { setError('Prompt is required'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/video/generate', form);
      setJobs(prev => [{ ...res.data, prompt: form.prompt, createdAt: new Date() }, ...prev]);
      setForm(f => ({ ...f, prompt: '' }));
      setActiveTab('jobs');
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceover = async () => {
    if (!form.prompt.trim()) { setError('Enter text for voiceover'); return; }
    setLoading(true);
    try {
      const res = await api.post('/api/video/voiceover', { text: form.prompt });
      if (res.data.audio) {
        const audio = new Audio(`data:${res.data.mimeType};base64,${res.data.audio}`);
        audio.play();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Voiceover failed. Check ElevenLabs API key.');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (job) => {
    try {
      const res = await api.get(`/api/video/status/${job.providerId}/${job.jobId}`);
      setJobs(prev => prev.map(j => j.jobId === job.jobId ? { ...j, ...res.data } : j));
    } catch {}
  };

  const selectedProvider = providers.find(p => p.id === form.provider);

  return (
    <div>
      <div className="page-header">
        <h1>Video Studio</h1>
        <p>Direct access to all AI video generation models</p>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'generate' ? 'active' : ''}`} onClick={() => setActiveTab('generate')}>Generate</button>
        <button className={`tab-btn ${activeTab === 'voiceover' ? 'active' : ''}`} onClick={() => setActiveTab('voiceover')}>Voiceover</button>
        <button className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}>Jobs ({jobs.length})</button>
        <button className={`tab-btn ${activeTab === 'models' ? 'active' : ''}`} onClick={() => setActiveTab('models')}>All Models</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {activeTab === 'generate' && (
        <form onSubmit={handleGenerate}>
          <div className="card">
            <div className="card-title">Generate Video</div>
            <div className="form-group">
              <label>Video Prompt *</label>
              <textarea
                value={form.prompt}
                onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
                placeholder="Describe exactly what you want to see in the video. Be specific about visuals, movement, style, lighting..."
                rows={4}
              />
            </div>

            <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label>AI Model</label>
                <select value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {!p.isConfigured ? '(needs API key)' : ''}
                    </option>
                  ))}
                </select>
                {selectedProvider && (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                    Quality: {selectedProvider.quality} · Speed: {selectedProvider.speed} · Max: {selectedProvider.maxDurationMinutes}m
                    {!selectedProvider.isConfigured && <span style={{ color: 'var(--yellow)', marginLeft: 8 }}>⚠ Will simulate in dev mode</span>}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Aspect Ratio</label>
                <select value={form.aspectRatio} onChange={e => setForm(f => ({ ...f, aspectRatio: e.target.value }))}>
                  {ASPECT_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid-3" style={{ gap: 16, marginBottom: 20 }}>
              <div className="form-group">
                <label>Platform</label>
                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram_reels">Instagram Reels</option>
                  <option value="youtube_shorts">YouTube Shorts</option>
                </select>
              </div>
              <div className="form-group">
                <label>Format</label>
                <select value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}>
                  <option value="shortform">Short-form</option>
                  <option value="longform">Long-form</option>
                </select>
              </div>
              <div className="form-group">
                <label>Duration (seconds)</label>
                <input
                  type="number"
                  min={5}
                  max={selectedProvider?.maxDuration || 120}
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? <><div className="spinner" /> Queuing...</> : '▶ Generate Video'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'voiceover' && (
        <div className="card">
          <div className="card-title">AI Voiceover — ElevenLabs</div>
          <div className="form-group">
            <label>Script / Text</label>
            <textarea
              value={form.prompt}
              onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
              placeholder="Enter the text you want to convert to speech..."
              rows={6}
            />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>
            Requires ELEVEN_API_KEY in .env. Audio will play in browser.
          </p>
          <button className="btn btn-primary" onClick={handleVoiceover} disabled={loading}>
            {loading ? <><div className="spinner" /> Generating...</> : '♪ Generate Voiceover'}
          </button>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div>
          {jobs.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">▶</div>
                <h3>No jobs yet</h3>
                <p>Generate your first video to see jobs here</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {jobs.map((job, i) => (
                <div className="card" key={i} style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{job.provider}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{job.prompt?.substring(0, 100)}...</div>
                      <code style={{ fontSize: 11, background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4 }}>{job.jobId}</code>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`badge ${job.status === 'completed' ? 'badge-green' : job.status === 'failed' ? 'badge-red' : 'badge-yellow'}`}>
                        {job.status || 'processing'}
                      </span>
                      <button className="btn btn-secondary btn-sm" onClick={() => checkStatus(job)}>↻ Status</button>
                    </div>
                  </div>
                  {job.videoUrl && (
                    <div style={{ marginTop: 12 }}>
                      <video controls src={job.videoUrl} style={{ width: '100%', maxHeight: 300, borderRadius: 6 }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'models' && (
        <div>
          <div className="grid-3" style={{ gap: 14 }}>
            {providers.map(p => (
              <div className="card" key={p.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <span className={`badge ${p.isConfigured ? 'badge-green' : 'badge-gray'}`}>
                    {p.isConfigured ? 'Ready' : 'Needs key'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>Type: {p.type}</div>
                  <div>Quality: {p.quality}</div>
                  <div>Speed: {p.speed}</div>
                  <div>Max: {p.maxDurationMinutes}m</div>
                  <div>Best for: {p.bestFor?.join(', ')}</div>
                </div>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, width: '100%' }}
                  onClick={() => { setForm(f => ({ ...f, provider: p.id })); setActiveTab('generate'); }}>
                  Use This Model
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
