import React, { useState } from 'react';
import axios from 'axios';
import './ProjectCreator.css';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const DURATION_PRESETS = [
  { label: '15 sec', seconds: 15, category: 'Short Form' },
  { label: '30 sec', seconds: 30, category: 'Short Form' },
  { label: '60 sec', seconds: 60, category: 'Short Form' },
  { label: '90 sec', seconds: 90, category: 'Short Form' },
  { label: '3 min', seconds: 180, category: 'Short Form' },
  { label: '5 min', seconds: 300, category: 'Short Form' },
  { label: '10 min', seconds: 600, category: 'Long Form' },
  { label: '15 min', seconds: 900, category: 'Long Form' },
  { label: '20 min', seconds: 1200, category: 'Long Form' },
  { label: '30 min', seconds: 1800, category: 'Long Form' }
];

const PLATFORM_OPTIONS = [
  { id: 'youtube', label: 'YouTube', icon: '▶' },
  { id: 'tiktok', label: 'TikTok', icon: '♪' },
  { id: 'instagram', label: 'Instagram Reels', icon: '◉' },
  { id: 'facebook', label: 'Facebook', icon: 'f' },
  { id: 'youtube_shorts', label: 'YouTube Shorts', icon: '⚡' }
];

const CONCEPT_TEMPLATES = [
  { label: 'Betrayal Exposed', concept: 'A trusted business partner secretly sabotaged everything — the reckoning is coming' },
  { label: 'Cold Revenge', concept: 'After being framed and fired, she spent 3 years building the most calculated comeback in corporate history' },
  { label: 'Historical Mystery', concept: 'The unsolved disappearance that baffled investigators for decades — until one witness came forward' },
  { label: 'Psychological Warfare', concept: 'He manipulated everyone around him for 10 years. What he didn\'t know: she was watching every move.' },
  { label: 'Justice Served', concept: 'The whistleblower who took down a billion-dollar empire — and paid with everything she had' }
];

const ProjectCreator = ({ onBack, onCreated }) => {
  const [step, setStep] = useState(1); // 1: concept, 2: settings, 3: review
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    title: '',
    concept: '',
    targetDuration: 600,
    targetPlatforms: ['youtube'],
    niche: 'reckoning_files',
    aspectRatio: '16:9',
    style: 'cinematic',
    autoStart: true
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const togglePlatform = (platformId) => {
    const current = form.targetPlatforms;
    const updated = current.includes(platformId)
      ? current.filter(p => p !== platformId)
      : [...current, platformId];
    update('targetPlatforms', updated);
  };

  const applyTemplate = (template) => {
    update('concept', template.concept);
    if (!form.title) {
      update('title', `The Reckoning Files: ${template.label}`);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.concept.trim()) {
      setError('Title and concept are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await axios.post(`${API_BASE}/projects`, {
        ...form,
        userId: 'dev-user'
      });

      onCreated({ _id: res.data.projectId, ...form, pipelineStatus: 'processing' });
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedDuration = DURATION_PRESETS.find(d => d.seconds === form.targetDuration);

  return (
    <div className="project-creator">
      <div className="creator-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h1>New Cinematic Project</h1>
        <div className="creator-steps">
          <span className={`step ${step >= 1 ? 'active' : ''}`}>1. Concept</span>
          <span className="step-arrow">→</span>
          <span className={`step ${step >= 2 ? 'active' : ''}`}>2. Settings</span>
          <span className="step-arrow">→</span>
          <span className={`step ${step >= 3 ? 'active' : ''}`}>3. Launch</span>
        </div>
      </div>

      {step === 1 && (
        <div className="creator-step">
          <h2>What's the story?</h2>
          <p className="step-desc">The Reckoning Files specializes in cold, calculated stories of betrayal, revenge, and justice.</p>

          <div className="template-grid">
            <p className="template-label">Quick start with a template:</p>
            {CONCEPT_TEMPLATES.map(t => (
              <button key={t.label} className="template-btn" onClick={() => applyTemplate(t)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="form-group">
            <label>Project Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => update('title', e.target.value)}
              placeholder="The Reckoning Files: [Your Story]"
              className="input-dark"
            />
          </div>

          <div className="form-group">
            <label>Story Concept *</label>
            <textarea
              value={form.concept}
              onChange={e => update('concept', e.target.value)}
              placeholder="Describe the core story. The more specific, the better the AI performs. Include: who was betrayed, by whom, what happened, and what the reckoning looks like..."
              rows={6}
              className="input-dark"
            />
            <span className="char-count">{form.concept.length} characters</span>
          </div>

          <button
            className="btn-next"
            onClick={() => setStep(2)}
            disabled={!form.title.trim() || !form.concept.trim()}
          >
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="creator-step">
          <h2>Production Settings</h2>

          <div className="form-group">
            <label>Target Duration</label>
            <div className="duration-grid">
              {['Short Form', 'Long Form'].map(category => (
                <div key={category} className="duration-category">
                  <span className="category-label">{category}</span>
                  <div className="duration-buttons">
                    {DURATION_PRESETS.filter(d => d.category === category).map(preset => (
                      <button
                        key={preset.seconds}
                        className={`duration-btn ${form.targetDuration === preset.seconds ? 'selected' : ''}`}
                        onClick={() => update('targetDuration', preset.seconds)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Target Platforms</label>
            <div className="platform-grid">
              {PLATFORM_OPTIONS.map(p => (
                <button
                  key={p.id}
                  className={`platform-btn ${form.targetPlatforms.includes(p.id) ? 'selected' : ''}`}
                  onClick={() => togglePlatform(p.id)}
                >
                  <span className="platform-icon">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Aspect Ratio</label>
              <select
                value={form.aspectRatio}
                onChange={e => update('aspectRatio', e.target.value)}
                className="select-dark"
              >
                <option value="16:9">16:9 — YouTube / Landscape</option>
                <option value="9:16">9:16 — TikTok / Shorts / Reels</option>
                <option value="1:1">1:1 — Square</option>
              </select>
            </div>

            <div className="form-group">
              <label>Visual Style</label>
              <select
                value={form.style}
                onChange={e => update('style', e.target.value)}
                className="select-dark"
              >
                <option value="cinematic">Cinematic</option>
                <option value="documentary">Documentary</option>
                <option value="dark_thriller">Dark Thriller</option>
                <option value="historical">Historical</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.autoStart}
                onChange={e => update('autoStart', e.target.checked)}
              />
              <span>Auto-start AI pipeline after creation</span>
            </label>
          </div>

          <div className="step-nav">
            <button className="btn-back-step" onClick={() => setStep(1)}>← Back</button>
            <button className="btn-next" onClick={() => setStep(3)}>Review →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="creator-step">
          <h2>Ready to Generate</h2>

          <div className="review-card">
            <div className="review-item">
              <span className="review-label">Title</span>
              <span className="review-value">{form.title}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Concept</span>
              <span className="review-value concept-preview">{form.concept}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Duration</span>
              <span className="review-value">{selectedDuration?.label || `${form.targetDuration}s`}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Platforms</span>
              <span className="review-value">{form.targetPlatforms.join(', ')}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Style</span>
              <span className="review-value">{form.style}</span>
            </div>
          </div>

          <div className="pipeline-preview">
            <h3>AI Pipeline will run:</h3>
            <div className="pipeline-steps">
              {[
                'Research Agent', 'Trend Agent', 'Script Agent',
                'Viral Gate (90+ required)', 'Director Agent',
                'Prompt Engineer', 'Video Generation', 'Voice Agent',
                'Music Engine', 'Editing Agent', 'Thumbnail Agent',
                'SEO Agent', 'Publishing Agent'
              ].map((step, i) => (
                <div key={i} className={`pipeline-step ${step.includes('Gate') ? 'gate' : ''}`}>
                  <span className="step-num">{i + 1}</span>
                  <span className="step-name">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="step-nav">
            <button className="btn-back-step" onClick={() => setStep(2)}>← Back</button>
            <button
              className="btn-launch"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Launching...' : '⚡ Launch Reckoning Studio'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCreator;
