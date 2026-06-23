import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', icon: '▶', ratio: '16:9', desc: 'Long-form content' },
  { id: 'tiktok', label: 'TikTok', icon: '♪', ratio: '9:16', desc: 'Short viral clips' },
  { id: 'instagram_reels', label: 'Reels', icon: '◎', ratio: '9:16', desc: 'Instagram Reels' },
  { id: 'youtube_shorts', label: 'Shorts', icon: '▸', ratio: '9:16', desc: 'YouTube Shorts' }
];

const CONTENT_TYPES = {
  youtube: [
    { id: 'longform', label: 'Long-form (5-10 min)', duration: 60 },
    { id: 'extended', label: 'Extended (10-15 min)', duration: 600 }
  ],
  tiktok: [{ id: 'shortform', label: 'Short-form (15-60s)', duration: 30 }],
  instagram_reels: [{ id: 'shortform', label: 'Reel (15-90s)', duration: 30 }],
  youtube_shorts: [{ id: 'shortform', label: 'Short (under 60s)', duration: 30 }]
};

const STYLES = ['educational', 'entertaining', 'documentary', 'tutorial', 'vlog', 'cinematic', 'motivational', 'comedy'];

const STEPS = ['Platform', 'Topic & Style', 'Generate Script', 'Review & Video'];

export default function ContentCreator() {
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState('youtube');
  const [form, setForm] = useState({
    topic: '',
    contentType: 'longform',
    style: 'educational',
    targetAudience: 'general'
  });
  const [scriptResult, setScriptResult] = useState(null);
  const [contentId, setContentId] = useState(null);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoJob, setVideoJob] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (step === 3) fetchProviders();
  }, [step]);

  useEffect(() => {
    const types = CONTENT_TYPES[platform];
    if (types && !types.find(t => t.id === form.contentType)) {
      setForm(f => ({ ...f, contentType: types[0].id }));
    }
  }, [platform]);

  const fetchProviders = async () => {
    try {
      const res = await axios.get(`/api/video/providers/${platform}`);
      setProviders(res.data.data || []);
      const first = (res.data.data || [])[0];
      if (first) setSelectedProvider(first.id);
    } catch {
      const res = await axios.get('/api/video/providers');
      setProviders(res.data.data || []);
    }
  };

  const handleGenerateScript = async () => {
    if (!form.topic.trim()) { setError('Please enter a topic'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/content/create', {
        topic: form.topic,
        platform,
        contentType: form.contentType,
        style: form.style,
        targetAudience: form.targetAudience
      });
      setScriptResult(res.data);
      setContentId(res.data.contentId);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Script generation failed. Check your ANTHROPIC_API_KEY.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!contentId) return;
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`/api/content/${contentId}/generate-video`, {
        provider: selectedProvider
      });
      setVideoJob(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Video generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0); setScriptResult(null); setContentId(null);
    setVideoJob(null); setError(''); setForm({ topic: '', contentType: 'longform', style: 'educational', targetAudience: 'general' });
  };

  return (
    <div>
      <div className="page-header">
        <h1>Create Content</h1>
        <p>Go from topic to AI-generated video in minutes</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: i < step ? 'var(--green)' : i === step ? 'var(--accent)' : 'var(--surface2)',
                color: i <= step ? 'white' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700
              }}>{i < step ? '✓' : i + 1}</div>
              <span style={{ fontSize: 13, color: i === step ? 'var(--text)' : 'var(--text-muted)', fontWeight: i === step ? 600 : 400 }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--border)', alignSelf: 'center' }} />}
          </React.Fragment>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Step 0: Platform */}
      {step === 0 && (
        <div className="card">
          <div className="card-title">Choose Your Platform</div>
          <div className="grid-4" style={{ gap: 12 }}>
            {PLATFORMS.map(p => (
              <div
                key={p.id}
                className={`provider-card ${platform === p.id ? 'selected' : ''}`}
                onClick={() => setPlatform(p.id)}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{p.icon}</div>
                <div className="provider-name">{p.label}</div>
                <div className="provider-meta">{p.desc}</div>
                <div className="provider-meta" style={{ marginTop: 4 }}>{p.ratio}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <button className="btn btn-primary" onClick={() => setStep(1)}>Continue →</button>
          </div>
        </div>
      )}

      {/* Step 1: Topic & Style */}
      {step === 1 && (
        <div className="card">
          <div className="card-title">Topic & Style</div>
          <div className="form-group">
            <label>Video Topic *</label>
            <textarea
              value={form.topic}
              onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
              placeholder="e.g. 'How to start investing with $100', '5 productivity hacks that changed my life', 'Best AI tools for creators in 2025'"
              rows={3}
            />
          </div>

          <div className="grid-3" style={{ gap: 16 }}>
            <div className="form-group">
              <label>Content Type</label>
              <select value={form.contentType} onChange={e => setForm(f => ({ ...f, contentType: e.target.value }))}>
                {(CONTENT_TYPES[platform] || CONTENT_TYPES.youtube).map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Style</label>
              <select value={form.style} onChange={e => setForm(f => ({ ...f, style: e.target.value }))}>
                {STYLES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Target Audience</label>
              <input
                value={form.targetAudience}
                onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))}
                placeholder="e.g. beginners, entrepreneurs"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setStep(0)}>← Back</button>
            <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!form.topic.trim()}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Generate Script */}
      {step === 2 && (
        <div className="card">
          <div className="card-title">Generate AI Script</div>
          <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>SUMMARY</div>
            <div><strong>Platform:</strong> {platform} &nbsp;·&nbsp; <strong>Type:</strong> {form.contentType} &nbsp;·&nbsp; <strong>Style:</strong> {form.style}</div>
            <div style={{ marginTop: 6 }}><strong>Topic:</strong> {form.topic}</div>
          </div>

          <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 13 }}>
            Claude AI will generate a complete script including hook, body, call-to-action, SEO title, description, tags, and a video prompt ready for AI video generation.
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary btn-lg" onClick={handleGenerateScript} disabled={loading}>
              {loading ? <><div className="spinner" /> Generating Script...</> : '✦ Generate Script with AI'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Video */}
      {step === 3 && scriptResult && (
        <div>
          {!videoJob ? (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-title">Generated Script</div>
                <div style={{ marginBottom: 16, padding: '8px 14px', background: 'var(--surface2)', borderRadius: 8 }}>
                  <span style={{ fontWeight: 700 }}>{scriptResult.title}</span>
                </div>

                <div className="script-label">Hook (Opening)</div>
                <div className="script-block">{scriptResult.script?.hook}</div>

                <div className="script-label">Main Body</div>
                <div className="script-block" style={{ maxHeight: 200, overflowY: 'auto' }}>{scriptResult.script?.body}</div>

                <div className="script-label">Call to Action</div>
                <div className="script-block">{scriptResult.script?.callToAction}</div>

                {scriptResult.seo?.tags?.length > 0 && (
                  <div>
                    <div className="script-label">SEO Tags</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {scriptResult.seo.tags.map((t, i) => (
                        <span key={i} className="badge badge-blue">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-title">Generate Video</div>
                <div className="form-group">
                  <label>Choose AI Video Model</label>
                  <div className="provider-grid">
                    {providers.map(p => (
                      <div
                        key={p.id}
                        className={`provider-card ${selectedProvider === p.id ? 'selected' : ''} ${!p.isConfigured ? 'unconfigured' : ''}`}
                        onClick={() => setSelectedProvider(p.id)}
                        title={!p.isConfigured ? 'API key not configured — will simulate in dev mode' : ''}
                      >
                        <div className="provider-name">{p.name}</div>
                        <div className="provider-meta">{p.quality} quality · {p.speed} speed</div>
                        <div className="provider-meta">Max {p.maxDurationMinutes}m</div>
                        {!p.isConfigured && <div className="provider-meta" style={{ color: 'var(--yellow)', marginTop: 4 }}>⚠ Needs API key</div>}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'var(--surface2)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 12 }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>VIDEO PROMPT</div>
                  <div style={{ color: 'var(--text)' }}>{scriptResult.videoPrompt || scriptResult.script?.fullScript?.substring(0, 200) + '...'}</div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={reset}>Start Over</button>
                  <button className="btn btn-primary btn-lg" onClick={handleGenerateVideo} disabled={loading || !selectedProvider}>
                    {loading ? <><div className="spinner" /> Queuing Video...</> : '▶ Generate Video'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <div className="alert alert-success" style={{ marginBottom: 20 }}>
                Video generation queued successfully!
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 8 }}><strong>Provider:</strong> {videoJob.provider}</div>
                <div style={{ marginBottom: 8 }}><strong>Job ID:</strong> <code style={{ background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4 }}>{videoJob.jobId}</code></div>
                <div style={{ marginBottom: 8 }}><strong>Estimated time:</strong> ~{Math.round(videoJob.estimatedTime / 60)} minutes</div>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 13 }}>
                Your video is being generated. Check the Library to track its status.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={reset}>Create Another</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
