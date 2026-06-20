import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GrowthTechStudio.css';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const CONTENT_PILLARS = [
  { id: 'business_secrets', label: 'Business Secrets', icon: '🔐' },
  { id: 'entrepreneur_mindset', label: 'Entrepreneur Mindset', icon: '🧠' },
  { id: 'wealth_building', label: 'Wealth Building', icon: '💰' },
  { id: 'startup_psychology', label: 'Startup Psychology', icon: '⚡' },
  { id: 'side_hustle', label: 'Side Hustle Systems', icon: '🚀' },
  { id: 'tech_leverage', label: 'Tech Leverage', icon: '🖥️' },
  { id: 'market_domination', label: 'Market Domination', icon: '🎯' },
  { id: 'productivity_hacks', label: 'Productivity Hacks', icon: '⏱️' }
];

const HOOK_FORMULAS = [
  { id: 'nobody_tells', label: 'The Secret', example: 'The thing nobody tells you about building a $1M business...' },
  { id: 'i_made', label: 'The Result', example: 'I made $47k in 30 days doing something most people think is stupid.' },
  { id: 'stop_doing', label: 'The Warning', example: 'Stop posting content every day. Here\'s exactly why it\'s killing your growth.' },
  { id: 'years_ago', label: 'The Journey', example: '3 years ago I was broke working a 9-5. Here\'s the one decision that changed everything.' },
  { id: 'the_secret', label: 'The Industry Secret', example: 'The business secret they don\'t want you to know (but I\'m telling you anyway)' }
];

const DURATION_OPTIONS = [
  { seconds: 30, label: '30 sec', platform: 'TikTok/Reels' },
  { seconds: 60, label: '1 min', platform: 'All Platforms' },
  { seconds: 90, label: '90 sec', platform: 'TikTok/Reels' },
  { seconds: 180, label: '3 min', platform: 'YouTube Shorts+' },
  { seconds: 300, label: '5 min', platform: 'YouTube' },
  { seconds: 600, label: '10 min', platform: 'YouTube Long Form' }
];

const GrowthTechStudio = ({ onCreateProject }) => {
  const [step, setStep] = useState('ideate'); // ideate | strategy | create
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState(null);
  const [creatorProfile, setCreatorProfile] = useState(null);

  const [form, setForm] = useState({
    concept: '',
    selectedPillar: '',
    hookFormula: 'nobody_tells',
    targetDuration: 60,
    specificNumber: '',
    counterIntuitiveAngle: '',
    audiencePainPoint: '',
    result: ''
  });

  useEffect(() => {
    fetchCreatorProfile();
  }, []);

  const fetchCreatorProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE}/creators/sina.growthtech`);
      setCreatorProfile(res.data);
    } catch (e) {}
  };

  const update = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const buildConcept = () => {
    const hook = HOOK_FORMULAS.find(h => h.id === form.hookFormula);
    const parts = [];
    if (form.counterIntuitiveAngle) parts.push(form.counterIntuitiveAngle);
    if (form.specificNumber) parts.push(`Specific proof: ${form.specificNumber}`);
    if (form.audiencePainPoint) parts.push(`Audience pain: ${form.audiencePainPoint}`);
    if (form.result) parts.push(`Result/transformation: ${form.result}`);
    return form.concept || parts.join('. ');
  };

  const generateStrategy = async () => {
    const concept = buildConcept();
    if (!concept.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/creators/strategy`, {
        concept,
        nicheId: 'growth_tech',
        targetDuration: form.targetDuration
      });
      setStrategy(res.data.strategy);
      setStep('strategy');
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const launchProject = async () => {
    const concept = buildConcept();
    const hookText = strategy?.creatorModeledHook || concept;

    const title = `GrowthTech: ${concept.substring(0, 50)}`;

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/projects`, {
        title,
        concept: `${concept}\n\nCREATOR STRATEGY:\n${JSON.stringify(strategy || {})}`,
        targetDuration: form.targetDuration,
        targetPlatforms: form.targetDuration <= 90
          ? ['tiktok', 'instagram', 'youtube_shorts']
          : ['youtube', 'tiktok'],
        niche: 'growth_tech',
        aspectRatio: form.targetDuration <= 90 ? '9:16' : '16:9',
        style: 'raw_authentic_direct',
        autoStart: true,
        userId: 'dev-user'
      });

      onCreateProject({
        _id: res.data.projectId,
        title,
        pipelineStatus: 'processing',
        concept,
        targetDuration: form.targetDuration,
        targetPlatforms: form.targetDuration <= 90 ? ['tiktok', 'instagram', 'youtube_shorts'] : ['youtube', 'tiktok'],
        niche: 'growth_tech'
      });
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="growthtech-studio">
      <div className="gt-header">
        <div className="gt-brand">
          <span className="gt-icon">⚡</span>
          <div>
            <h2>GrowthTech Studio</h2>
            <p className="gt-subtitle">Modeled after @sina.growthtech · Raw · Direct · Viral</p>
          </div>
        </div>
        {creatorProfile && (
          <div className="creator-badge">
            <span className="creator-handle">@{creatorProfile.handle}</span>
            <span className="creator-platform">{creatorProfile.platform}</span>
          </div>
        )}
      </div>

      {creatorProfile && (
        <div className="creator-dna">
          <h3>Creator DNA — @sina.growthtech</h3>
          <div className="dna-grid">
            <div className="dna-item">
              <span className="dna-label">Viral Trigger</span>
              <span className="dna-value">{creatorProfile.viralPatterns?.peakViralTrigger?.replace(/_/g, ' ')}</span>
            </div>
            <div className="dna-item">
              <span className="dna-label">Share Trigger</span>
              <span className="dna-value">{creatorProfile.viralPatterns?.shareTrigger?.replace(/_/g, ' ')}</span>
            </div>
            <div className="dna-item">
              <span className="dna-label">Comment Trigger</span>
              <span className="dna-value">{creatorProfile.viralPatterns?.commentTrigger?.replace(/_/g, ' ')}</span>
            </div>
            <div className="dna-item">
              <span className="dna-label">Avg Views</span>
              <span className="dna-value">{creatorProfile.viralPatterns?.avgViews}</span>
            </div>
          </div>
          <div className="hook-formulas">
            <span className="dna-label">Proven Hook Formulas:</span>
            {(creatorProfile.hookFormulas || []).map((h, i) => (
              <div key={i} className="formula-pill">"{h}"</div>
            ))}
          </div>
        </div>
      )}

      {step === 'ideate' && (
        <div className="gt-section">
          <h3>Build Your Content Concept</h3>

          <div className="content-pillars">
            <label className="gt-label">Content Pillar</label>
            <div className="pillar-grid">
              {CONTENT_PILLARS.map(p => (
                <button
                  key={p.id}
                  className={`pillar-btn ${form.selectedPillar === p.id ? 'active' : ''}`}
                  onClick={() => update('selectedPillar', p.id)}
                >
                  <span>{p.icon}</span> {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="gt-label">Hook Formula</label>
            <div className="hook-options">
              {HOOK_FORMULAS.map(h => (
                <div
                  key={h.id}
                  className={`hook-option ${form.hookFormula === h.id ? 'active' : ''}`}
                  onClick={() => update('hookFormula', h.id)}
                >
                  <div className="hook-label">{h.label}</div>
                  <div className="hook-example">"{h.example}"</div>
                </div>
              ))}
            </div>
          </div>

          <div className="insight-builder">
            <h4>Insight Builder</h4>
            <div className="gt-form-grid">
              <div className="form-group">
                <label className="gt-label">Counter-Intuitive Angle *</label>
                <input
                  className="gt-input"
                  value={form.counterIntuitiveAngle}
                  onChange={e => update('counterIntuitiveAngle', e.target.value)}
                  placeholder="The thing people get wrong about [topic]..."
                />
              </div>
              <div className="form-group">
                <label className="gt-label">Specific Number/Stat</label>
                <input
                  className="gt-input"
                  value={form.specificNumber}
                  onChange={e => update('specificNumber', e.target.value)}
                  placeholder="e.g. $47k in 30 days, 10x in 6 months..."
                />
              </div>
              <div className="form-group">
                <label className="gt-label">Audience Pain Point</label>
                <input
                  className="gt-input"
                  value={form.audiencePainPoint}
                  onChange={e => update('audiencePainPoint', e.target.value)}
                  placeholder="What your audience is struggling with..."
                />
              </div>
              <div className="form-group">
                <label className="gt-label">Transformation/Result</label>
                <input
                  className="gt-input"
                  value={form.result}
                  onChange={e => update('result', e.target.value)}
                  placeholder="What they can achieve after watching..."
                />
              </div>
            </div>

            <div className="form-group">
              <label className="gt-label">Or write the full concept directly:</label>
              <textarea
                className="gt-textarea"
                value={form.concept}
                onChange={e => update('concept', e.target.value)}
                placeholder="The specific business insight you want to share..."
                rows={3}
              />
            </div>
          </div>

          <div className="duration-select">
            <label className="gt-label">Duration</label>
            <div className="duration-row">
              {DURATION_OPTIONS.map(d => (
                <button
                  key={d.seconds}
                  className={`dur-btn ${form.targetDuration === d.seconds ? 'active' : ''}`}
                  onClick={() => update('targetDuration', d.seconds)}
                >
                  <span className="dur-time">{d.label}</span>
                  <span className="dur-platform">{d.platform}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="concept-preview">
            <label className="gt-label">Concept Preview</label>
            <div className="preview-box">{buildConcept() || 'Fill in the fields above...'}</div>
          </div>

          <button
            className="btn-gt-primary"
            onClick={generateStrategy}
            disabled={loading || !buildConcept().trim()}
          >
            {loading ? 'Generating strategy...' : '⚡ Generate Creator Strategy'}
          </button>
        </div>
      )}

      {step === 'strategy' && strategy && (
        <div className="gt-section">
          <div className="strategy-header">
            <h3>Creator Strategy Generated</h3>
            <button className="btn-gt-outline" onClick={() => setStep('ideate')}>← Edit Concept</button>
          </div>

          <div className="strategy-card hook-card">
            <div className="strategy-label">@sina.growthtech Hook</div>
            <div className="strategy-hook">"{strategy.creatorModeledHook}"</div>
            <div className="strategy-formula">Formula: {strategy.hookFormula}</div>
          </div>

          <div className="strategy-grid">
            <StrategyBlock label="Content Angle" value={strategy.contentAngle} />
            <StrategyBlock label="Audience Pain Point" value={strategy.audiencePainPoint} />
            <StrategyBlock label="Share Trigger" value={strategy.viralPrediction?.shareTrigger} />
            <StrategyBlock label="Comment Trigger" value={strategy.viralPrediction?.commentTrigger} />
          </div>

          {strategy.visualStrategy && (
            <div className="visual-strategy">
              <h4>Visual Strategy</h4>
              <div className="vs-grid">
                <VsItem label="Camera" value={strategy.visualStrategy.cameraStyle?.replace(/_/g, ' ')} />
                <VsItem label="Background" value={strategy.visualStrategy.backgroundSuggestion} />
                <VsItem label="Editing" value={strategy.visualStrategy.editingNotes?.replace(/_/g, ' ')} />
                <VsItem label="B-Roll" value={strategy.visualStrategy.brollStyle} />
              </div>
            </div>
          )}

          {strategy.titleFormulas && (
            <div className="title-options">
              <h4>Title Options</h4>
              {strategy.titleFormulas.map((t, i) => (
                <div key={i} className="title-option">{t}</div>
              ))}
            </div>
          )}

          <button
            className="btn-gt-launch"
            onClick={launchProject}
            disabled={loading}
          >
            {loading ? 'Launching...' : '🚀 Launch GrowthTech Pipeline'}
          </button>
        </div>
      )}
    </div>
  );
};

const StrategyBlock = ({ label, value }) => (
  <div className="strategy-block">
    <span className="sb-label">{label}</span>
    <span className="sb-value">{value || '—'}</span>
  </div>
);

const VsItem = ({ label, value }) => (
  <div className="vs-item">
    <span className="vs-label">{label}</span>
    <span className="vs-value">{value || '—'}</span>
  </div>
);

export default GrowthTechStudio;
