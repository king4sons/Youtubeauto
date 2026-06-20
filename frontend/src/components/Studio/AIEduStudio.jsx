import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AIEduStudio.css';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const AI_TOOLS = [
  { id: 'claude_code', label: 'Claude Code', icon: '⚡', price: '$29/mo' },
  { id: 'cursor', label: 'Cursor AI', icon: '🖱️', price: '$20/mo' },
  { id: 'chatgpt', label: 'ChatGPT', icon: '🤖', price: '$20/mo' },
  { id: 'perplexity', label: 'Perplexity', icon: '🔍', price: '$20/mo' },
  { id: 'midjourney', label: 'Midjourney', icon: '🎨', price: '$10/mo' },
  { id: 'elevenlabs', label: 'ElevenLabs', icon: '🎙️', price: '$5/mo' },
  { id: 'make', label: 'Make.com', icon: '⚙️', price: '$9/mo' },
  { id: 'notion_ai', label: 'Notion AI', icon: '📝', price: '$10/mo' }
];

const PROJECT_TYPES = [
  { id: 'full_website', label: 'Full Website', icon: '🌐' },
  { id: 'saas_app', label: 'SaaS App', icon: '💻' },
  { id: 'online_course', label: 'Online Course', icon: '🎓' },
  { id: 'youtube_automation', label: 'YouTube Automation', icon: '▶️' },
  { id: 'ecommerce_store', label: 'eCommerce Store', icon: '🛒' },
  { id: 'ai_agent', label: 'AI Agent', icon: '🤖' },
  { id: 'content_system', label: 'Content System', icon: '📱' },
  { id: 'business_automation', label: 'Business Automation', icon: '🔄' }
];

const HOOK_TYPES = [
  { id: 'result_first', label: 'Result First', example: 'For $29/month, Claude Code built me an entire SaaS in 3 days...' },
  { id: 'price_shock', label: 'Price Shock', example: 'I replaced my $5,000/month developer with a $29 AI subscription...' },
  { id: 'tool_reveal', label: 'Tool Reveal', example: 'This AI tool nobody\'s talking about just changed everything for me...' },
  { id: 'live_demo', label: 'Live Demo', example: 'LIVE: Watch me build a full app in under 60 seconds with AI...' },
  { id: 'transformation', label: 'Transformation', example: 'I spent 3 months doing this manually. AI now does it in 30 seconds.' }
];

const DEMO_FORMATS = [
  { id: 'screen_only', label: 'Screen Recording', icon: '💻', desc: 'Pure screen share with narration' },
  { id: 'face_overlay', label: 'Face + Screen', icon: '🎥', desc: 'PiP face cam over screen recording' },
  { id: 'talking_head', label: 'Talking Head', icon: '👤', desc: 'Direct to camera with B-roll screen' }
];

const DURATION_OPTIONS = [
  { seconds: 30, label: '30 sec', platform: 'TikTok Hook' },
  { seconds: 60, label: '1 min', platform: 'All Platforms' },
  { seconds: 90, label: '90 sec', platform: 'TikTok/Reels' },
  { seconds: 180, label: '3 min', platform: 'YouTube Shorts+' },
  { seconds: 300, label: '5 min', platform: 'YouTube Tutorial' },
  { seconds: 600, label: '10 min', platform: 'Deep Tutorial' }
];

const AIEduStudio = ({ onCreateProject }) => {
  const [step, setStep] = useState('build'); // build | strategy | launch
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState(null);
  const [creatorProfile, setCreatorProfile] = useState(null);

  const [form, setForm] = useState({
    selectedTools: [],
    projectType: '',
    hookType: 'result_first',
    demoFormat: 'face_overlay',
    targetDuration: 60,
    whatWasBuilt: '',
    timeTaken: '',
    totalCost: '',
    stepCount: '',
    audiencePainPoint: '',
    customConcept: ''
  });

  useEffect(() => {
    fetchCreatorProfile();
  }, []);

  const fetchCreatorProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE}/creators/kevin.dink.ai`);
      setCreatorProfile(res.data);
    } catch (e) {}
  };

  const update = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const toggleTool = (toolId) => {
    setForm(p => ({
      ...p,
      selectedTools: p.selectedTools.includes(toolId)
        ? p.selectedTools.filter(t => t !== toolId)
        : [...p.selectedTools, toolId]
    }));
  };

  const buildConcept = () => {
    if (form.customConcept) return form.customConcept;
    const tools = form.selectedTools.map(id => AI_TOOLS.find(t => t.id === id)?.label).filter(Boolean);
    const type = PROJECT_TYPES.find(p => p.id === form.projectType)?.label;
    const parts = [];
    if (form.whatWasBuilt) parts.push(`Built: ${form.whatWasBuilt}`);
    if (tools.length) parts.push(`Using: ${tools.join(', ')}`);
    if (type) parts.push(`Project type: ${type}`);
    if (form.timeTaken) parts.push(`Time taken: ${form.timeTaken}`);
    if (form.totalCost) parts.push(`Total cost: ${form.totalCost}`);
    if (form.audiencePainPoint) parts.push(`Solves: ${form.audiencePainPoint}`);
    return parts.join('. ');
  };

  const totalToolCost = () => {
    if (form.totalCost) return form.totalCost;
    const costs = form.selectedTools.map(id => {
      const t = AI_TOOLS.find(t => t.id === id);
      return parseInt(t?.price) || 0;
    });
    const total = costs.reduce((a, b) => a + b, 0);
    return total > 0 ? `$${total}/mo` : '';
  };

  const generateStrategy = async () => {
    const concept = buildConcept();
    if (!concept.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/creators/strategy`, {
        concept,
        nicheId: 'ai_education',
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
    const tools = form.selectedTools.map(id => AI_TOOLS.find(t => t.id === id)?.label).join(', ');
    const title = `AI Edu: ${form.whatWasBuilt || concept.substring(0, 40)}`;

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/projects`, {
        title,
        concept: `${concept}\n\nTOOLS: ${tools}\nFORMAT: ${form.demoFormat}\nCOST: ${totalToolCost()}\nCREATOR STRATEGY:\n${JSON.stringify(strategy || {})}`,
        targetDuration: form.targetDuration,
        targetPlatforms: form.targetDuration <= 90
          ? ['tiktok', 'instagram', 'youtube_shorts']
          : ['youtube', 'tiktok'],
        niche: 'ai_education',
        aspectRatio: form.targetDuration <= 90 ? '9:16' : '16:9',
        style: 'screen_recording_tutorial',
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
        niche: 'ai_education'
      });
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aiedu-studio">
      <div className="ae-header">
        <div className="ae-brand">
          <span className="ae-icon">🤖</span>
          <div>
            <h2>AI Education Studio</h2>
            <p className="ae-subtitle">Modeled after @kevin.dink.ai · Live Build · Show Don't Tell · Save-Worthy</p>
          </div>
        </div>
        {creatorProfile && (
          <div className="creator-stats">
            <div className="stat-pill">
              <span className="stat-label">Save Rate</span>
              <span className="stat-val">~1:1</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Viral Trigger</span>
              <span className="stat-val">{creatorProfile.viralPatterns?.peakViralTrigger?.replace(/_/g, ' ')}</span>
            </div>
          </div>
        )}
      </div>

      {creatorProfile && (
        <div className="creator-dna-ae">
          <div className="dna-header">
            <span className="dna-badge">Creator DNA — @kevin.dink.ai</span>
            <span className="dna-save-rate">🔖 Save Rate Signal: {creatorProfile.viralPatterns?.saveTrigger?.replace(/_/g, ' ')}</span>
          </div>
          <div className="hook-pills">
            {(creatorProfile.hookFormulas || []).map((h, i) => (
              <div key={i} className="hook-pill">"{h}"</div>
            ))}
          </div>
        </div>
      )}

      {step === 'build' && (
        <div className="ae-section">
          <h3>Build Your Tutorial Concept</h3>

          <div className="form-block">
            <label className="ae-label">AI Tools Used (select all)</label>
            <div className="tools-grid">
              {AI_TOOLS.map(t => (
                <button
                  key={t.id}
                  className={`tool-btn ${form.selectedTools.includes(t.id) ? 'active' : ''}`}
                  onClick={() => toggleTool(t.id)}
                >
                  <span className="tool-icon">{t.icon}</span>
                  <span className="tool-name">{t.label}</span>
                  <span className="tool-price">{t.price}</span>
                </button>
              ))}
            </div>
            {form.selectedTools.length > 0 && (
              <div className="cost-badge">
                Total Stack Cost: <strong>{totalToolCost()}</strong>
              </div>
            )}
          </div>

          <div className="form-block">
            <label className="ae-label">Project Type</label>
            <div className="project-grid">
              {PROJECT_TYPES.map(p => (
                <button
                  key={p.id}
                  className={`project-btn ${form.projectType === p.id ? 'active' : ''}`}
                  onClick={() => update('projectType', p.id)}
                >
                  <span>{p.icon}</span> {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-block">
            <label className="ae-label">Hook Formula</label>
            <div className="hook-options-ae">
              {HOOK_TYPES.map(h => (
                <div
                  key={h.id}
                  className={`hook-opt ${form.hookType === h.id ? 'active' : ''}`}
                  onClick={() => update('hookType', h.id)}
                >
                  <div className="hook-opt-label">{h.label}</div>
                  <div className="hook-opt-example">"{h.example}"</div>
                </div>
              ))}
            </div>
          </div>

          <div className="build-details">
            <h4>Tutorial Details</h4>
            <div className="details-grid">
              <div className="form-group">
                <label className="ae-label">What Was Built / Achieved *</label>
                <input
                  className="ae-input"
                  value={form.whatWasBuilt}
                  onChange={e => update('whatWasBuilt', e.target.value)}
                  placeholder="e.g. Full SaaS app with auth and payments..."
                />
              </div>
              <div className="form-group">
                <label className="ae-label">Time Taken with AI</label>
                <input
                  className="ae-input"
                  value={form.timeTaken}
                  onChange={e => update('timeTaken', e.target.value)}
                  placeholder="e.g. 3 hours, 1 day, 45 minutes..."
                />
              </div>
              <div className="form-group">
                <label className="ae-label">Total Cost (override)</label>
                <input
                  className="ae-input"
                  value={form.totalCost}
                  onChange={e => update('totalCost', e.target.value)}
                  placeholder={`e.g. ${totalToolCost() || '$29/month'}...`}
                />
              </div>
              <div className="form-group">
                <label className="ae-label">Audience Pain This Solves</label>
                <input
                  className="ae-input"
                  value={form.audiencePainPoint}
                  onChange={e => update('audiencePainPoint', e.target.value)}
                  placeholder="What used to take days / cost $5k..."
                />
              </div>
            </div>
            <div className="form-group">
              <label className="ae-label">Or write the full concept directly:</label>
              <textarea
                className="ae-textarea"
                value={form.customConcept}
                onChange={e => update('customConcept', e.target.value)}
                placeholder="Describe the AI tutorial, live build, or tool reveal..."
                rows={3}
              />
            </div>
          </div>

          <div className="form-block">
            <label className="ae-label">Demo Format</label>
            <div className="format-row">
              {DEMO_FORMATS.map(f => (
                <button
                  key={f.id}
                  className={`format-btn ${form.demoFormat === f.id ? 'active' : ''}`}
                  onClick={() => update('demoFormat', f.id)}
                >
                  <span className="fmt-icon">{f.icon}</span>
                  <span className="fmt-label">{f.label}</span>
                  <span className="fmt-desc">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-block">
            <label className="ae-label">Duration</label>
            <div className="dur-row">
              {DURATION_OPTIONS.map(d => (
                <button
                  key={d.seconds}
                  className={`dur-btn-ae ${form.targetDuration === d.seconds ? 'active' : ''}`}
                  onClick={() => update('targetDuration', d.seconds)}
                >
                  <span className="dur-t">{d.label}</span>
                  <span className="dur-p">{d.platform}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="concept-preview-ae">
            <label className="ae-label">Concept Preview</label>
            <div className="preview-box-ae">{buildConcept() || 'Fill in the details above...'}</div>
          </div>

          <button
            className="btn-ae-primary"
            onClick={generateStrategy}
            disabled={loading || !buildConcept().trim()}
          >
            {loading ? 'Generating strategy...' : '🤖 Generate Creator Strategy'}
          </button>
        </div>
      )}

      {step === 'strategy' && strategy && (
        <div className="ae-section">
          <div className="strategy-header-ae">
            <h3>Tutorial Strategy Generated</h3>
            <button className="btn-ae-outline" onClick={() => setStep('build')}>← Edit Tutorial</button>
          </div>

          <div className="hook-showcase">
            <div className="hook-badge">@kevin.dink.ai Hook</div>
            <div className="hook-text">"{strategy.creatorModeledHook}"</div>
            <div className="hook-formula-tag">Formula: {strategy.hookFormula}</div>
          </div>

          <div className="strategy-grid-ae">
            <StrategyItem label="Content Angle" value={strategy.contentAngle} />
            <StrategyItem label="Save Hook" value={strategy.viralPrediction?.saveTrigger} />
            <StrategyItem label="Comment Hook" value={strategy.viralPrediction?.commentTrigger} />
            <StrategyItem label="Audience Pain" value={strategy.audiencePainPoint} />
          </div>

          {strategy.scriptStyle && (
            <div className="script-style-panel">
              <h4>Script Style Notes</h4>
              <div className="style-grid">
                <StyleItem label="Opening Energy" value={strategy.scriptStyle.openingEnergy} />
                <StyleItem label="Delivery" value={strategy.scriptStyle.deliveryNotes} />
                <StyleItem label="Captions" value={strategy.scriptStyle.captionStyle} />
                <StyleItem label="CTA Style" value={strategy.scriptStyle.closingCTA} />
              </div>
            </div>
          )}

          {strategy.visualStrategy && (
            <div className="visual-panel">
              <h4>Visual Strategy</h4>
              <div className="vis-grid">
                <VisItem label="Camera" value={strategy.visualStrategy.cameraStyle?.replace(/_/g, ' ')} />
                <VisItem label="Background" value={strategy.visualStrategy.backgroundSuggestion} />
                <VisItem label="Editing" value={strategy.visualStrategy.editingNotes?.replace(/_/g, ' ')} />
                <VisItem label="B-Roll" value={strategy.visualStrategy.brollStyle} />
              </div>
            </div>
          )}

          {strategy.titleFormulas && (
            <div className="titles-panel">
              <h4>Title Options</h4>
              {strategy.titleFormulas.map((t, i) => (
                <div key={i} className="title-row">{t}</div>
              ))}
            </div>
          )}

          <button
            className="btn-ae-launch"
            onClick={launchProject}
            disabled={loading}
          >
            {loading ? 'Launching...' : '🚀 Launch AI Education Pipeline'}
          </button>
        </div>
      )}
    </div>
  );
};

const StrategyItem = ({ label, value }) => (
  <div className="strategy-item-ae">
    <span className="si-label">{label}</span>
    <span className="si-value">{value || '—'}</span>
  </div>
);

const StyleItem = ({ label, value }) => (
  <div className="style-item">
    <span className="sty-label">{label}</span>
    <span className="sty-value">{value || '—'}</span>
  </div>
);

const VisItem = ({ label, value }) => (
  <div className="vis-item">
    <span className="vis-label">{label}</span>
    <span className="vis-value">{value || '—'}</span>
  </div>
);

export default AIEduStudio;
