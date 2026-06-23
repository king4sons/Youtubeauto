import React, { useState } from 'react';
import axios from 'axios';

const NICHES = ['Technology', 'Finance', 'Health & Fitness', 'Beauty', 'Gaming', 'Travel', 'Food', 'Education', 'Business', 'Lifestyle', 'Comedy', 'DIY', 'Motivation', 'News', 'Crypto'];

export default function IdeaGenerator() {
  const [form, setForm] = useState({ niche: '', platform: 'youtube', count: 10, style: 'educational' });
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.niche.trim()) { setError('Enter a niche'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/content/ideas/generate', form);
      setIdeas(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate ideas. Check ANTHROPIC_API_KEY.');
    } finally {
      setLoading(false);
    }
  };

  const VIEW_COLORS = { high: 'badge-green', medium: 'badge-yellow', low: 'badge-gray' };

  return (
    <div>
      <div className="page-header">
        <h1>Idea Generator</h1>
        <p>AI-powered content ideas optimized for your niche and platform</p>
      </div>

      <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
        <form onSubmit={handleGenerate}>
          <div className="card">
            <div className="card-title">Generate Ideas</div>

            <div className="form-group">
              <label>Your Niche *</label>
              <input
                value={form.niche}
                onChange={e => setForm(f => ({ ...f, niche: e.target.value }))}
                placeholder="e.g. personal finance, fitness for beginners"
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {NICHES.map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`badge ${form.niche === n ? 'badge-blue' : 'badge-gray'}`}
                    style={{ cursor: 'pointer', border: 'none' }}
                    onClick={() => setForm(f => ({ ...f, niche: n }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid-3" style={{ gap: 12 }}>
              <div className="form-group">
                <label>Platform</label>
                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram_reels">Instagram</option>
                  <option value="youtube_shorts">YT Shorts</option>
                </select>
              </div>
              <div className="form-group">
                <label>Style</label>
                <select value={form.style} onChange={e => setForm(f => ({ ...f, style: e.target.value }))}>
                  <option value="educational">Educational</option>
                  <option value="entertaining">Entertaining</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="comedy">Comedy</option>
                  <option value="motivational">Motivational</option>
                </select>
              </div>
              <div className="form-group">
                <label>Count</label>
                <select value={form.count} onChange={e => setForm(f => ({ ...f, count: parseInt(e.target.value) }))}>
                  <option value={5}>5 ideas</option>
                  <option value={10}>10 ideas</option>
                  <option value={15}>15 ideas</option>
                </select>
              </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? <><div className="spinner" /> Generating...</> : '✦ Generate Ideas'}
            </button>
          </div>
        </form>

        <div>
          {ideas.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">✦</div>
                <h3>No ideas yet</h3>
                <p>Enter your niche and generate ideas to see them here</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{ideas.length} Ideas Generated</div>
              {ideas.map((idea, i) => (
                <div className="card" key={i} style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{idea.title}</div>
                    <span className={`badge ${VIEW_COLORS[idea.estimatedViews] || 'badge-gray'}`} style={{ marginLeft: 10, flexShrink: 0 }}>
                      {idea.estimatedViews} views
                    </span>
                  </div>
                  {idea.hook && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 8 }}>
                      "{idea.hook}"
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {idea.tags?.map((t, ti) => <span key={ti} className="badge badge-blue">{t}</span>)}
                    </div>
                    <span className="badge badge-gray">{idea.contentType}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
