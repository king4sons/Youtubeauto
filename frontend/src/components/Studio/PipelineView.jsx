import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './PipelineView.css';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const STAGE_LABELS = {
  idea_generation: 'Research',
  trend_analysis: 'Trend Analysis',
  script_writing: 'Script Writing',
  storyboard_building: 'Storyboard',
  scene_planning: 'Director (Scene Planning)',
  prompt_generation: 'Prompt Engineering',
  video_generation: 'Video Generation',
  voiceover_generation: 'Voiceover',
  sound_design: 'Sound Design',
  music_engine: 'Music Engine',
  editing: 'AI Editing',
  thumbnail_creation: 'Thumbnail Creator',
  seo_generation: 'SEO Generation',
  publishing: 'Publishing'
};

const STAGE_ICONS = {
  idea_generation: '🔍',
  trend_analysis: '📈',
  script_writing: '✍️',
  storyboard_building: '🎬',
  scene_planning: '🎥',
  prompt_generation: '⚡',
  video_generation: '🖥️',
  voiceover_generation: '🎙️',
  sound_design: '🔊',
  music_engine: '🎵',
  editing: '✂️',
  thumbnail_creation: '🖼️',
  seo_generation: '🔎',
  publishing: '🚀'
};

const PipelineView = ({ project, onBack }) => {
  const [pipeline, setPipeline] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    fetchPipeline();

    // Connect to SSE stream
    const es = new EventSource(`${API_BASE}/projects/${project._id}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setMessages(prev => [...prev.slice(-100), msg]);

        // Refresh pipeline data on key events
        if (['stage_completed', 'viral_gate_passed', 'viral_gate_failed', 'pipeline_completed', 'pipeline_blocked'].includes(msg.eventType)) {
          fetchPipeline();
        }
      } catch (e) {}
    };

    es.onerror = () => {
      es.close();
    };

    // Poll every 5 seconds as backup
    const interval = setInterval(fetchPipeline, 5000);

    return () => {
      es.close();
      clearInterval(interval);
    };
  }, [project._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchPipeline = async () => {
    try {
      const res = await axios.get(`${API_BASE}/projects/${project._id}/pipeline`);
      setPipeline(res.data);
    } catch (err) {
      console.error('Pipeline fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const stageList = Object.keys(STAGE_LABELS);
  const stageStatuses = pipeline?.stages || {};
  const currentStageIndex = stageList.indexOf(pipeline?.currentStage);

  return (
    <div className="pipeline-view">
      <div className="pipeline-header">
        <button className="btn-back" onClick={onBack}>← Dashboard</button>
        <div className="pipeline-title">
          <h1>{project.title}</h1>
          <StatusBadge status={pipeline?.pipelineStatus || project.pipelineStatus} />
        </div>
      </div>

      {pipeline?.viralScore && (
        <div className="viral-score-panel">
          <h3>Viral Intelligence Score</h3>
          <div className="score-grid">
            <ScoreGauge label="Viral" value={pipeline.viralScore.viralScore} threshold={90} />
            <ScoreGauge label="Retention" value={pipeline.viralScore.retentionScore} threshold={90} />
            <ScoreGauge label="Story" value={pipeline.viralScore.storyScore} threshold={90} />
            <ScoreGauge label="Hook" value={pipeline.viralScore.hookScore} threshold={85} />
            <ScoreGauge label="Emotional" value={pipeline.viralScore.emotionalScore} threshold={80} />
          </div>
          {pipeline.viralScore.analysis && (
            <p className="score-analysis">{pipeline.viralScore.analysis}</p>
          )}
          <div className={`gate-status ${pipeline.viralGatePassed ? 'passed' : 'pending'}`}>
            {pipeline.viralGatePassed ? '✅ Viral Gate PASSED' : '⏳ Viral Gate Pending'}
          </div>
        </div>
      )}

      <div className="pipeline-layout">
        <div className="pipeline-stages">
          <h3>Production Pipeline</h3>
          {stageList.map((stage, index) => {
            const stageData = stageStatuses[stage];
            const status = stageData?.status || (index < currentStageIndex ? 'completed' : index === currentStageIndex ? 'processing' : 'pending');

            return (
              <div key={stage} className={`stage-item ${status}`}>
                <div className="stage-connector">
                  <div className={`stage-dot ${status}`} />
                  {index < stageList.length - 1 && <div className="stage-line" />}
                </div>
                <div className="stage-content">
                  <div className="stage-header">
                    <span className="stage-icon">{STAGE_ICONS[stage]}</span>
                    <span className="stage-name">{STAGE_LABELS[stage]}</span>
                    <StatusPill status={status} />
                  </div>
                  {stageData?.completedAt && (
                    <span className="stage-time">
                      {Math.round((new Date(stageData.completedAt) - new Date(stageData.startedAt)) / 1000)}s
                    </span>
                  )}
                  {stageData?.error && (
                    <span className="stage-error">{stageData.error}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pipeline-log">
          <h3>Agent Activity Log</h3>
          <div className="log-container">
            {messages.length === 0 ? (
              <p className="log-empty">Waiting for pipeline activity...</p>
            ) : (
              messages.map((msg, i) => (
                <LogEntry key={i} message={msg} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {pipeline?.pipelineStatus === 'completed' && (
        <div className="completion-panel">
          <h2>✅ Production Complete</h2>
          <div className="completion-stats">
            <div className="completion-item">
              <span className="c-label">Total Scenes</span>
              <span className="c-value">{pipeline.totalScenes}</span>
            </div>
            <div className="completion-item">
              <span className="c-label">Viral Score</span>
              <span className="c-value score">{pipeline.viralScore?.viralScore}</span>
            </div>
            {pipeline.seoTitle && (
              <div className="completion-item full-width">
                <span className="c-label">Optimized Title</span>
                <span className="c-value">{pipeline.seoTitle}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {pipeline?.pipelineStatus === 'blocked' && (
        <div className="blocked-panel">
          <h2>🚫 Pipeline Blocked — Viral Gate</h2>
          <p>This project could not achieve the required viral scores (90+) after 3 attempts.</p>
          <p>Review the viral score analysis and refine your concept.</p>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const colors = {
    pending: '#6B7280', processing: '#3B82F6', completed: '#10B981',
    failed: '#EF4444', blocked: '#F59E0B'
  };
  return (
    <span className="status-badge" style={{ background: colors[status] || '#6B7280' }}>
      {status}
    </span>
  );
};

const StatusPill = ({ status }) => {
  const map = {
    completed: { label: '✓', cls: 'pill-complete' },
    processing: { label: '⟳', cls: 'pill-processing' },
    failed: { label: '✗', cls: 'pill-failed' },
    pending: { label: '·', cls: 'pill-pending' }
  };
  const { label, cls } = map[status] || map.pending;
  return <span className={`status-pill ${cls}`}>{label}</span>;
};

const ScoreGauge = ({ label, value, threshold }) => {
  const passed = value >= threshold;
  const pct = Math.min(value, 100);
  return (
    <div className="score-gauge">
      <div className="gauge-bar">
        <div
          className={`gauge-fill ${passed ? 'pass' : 'fail'}`}
          style={{ width: `${pct}%` }}
        />
        <div className="gauge-threshold" style={{ left: `${threshold}%` }} />
      </div>
      <div className="gauge-label">
        <span>{label}</span>
        <span className={`gauge-value ${passed ? 'pass' : 'fail'}`}>{value || 0}</span>
      </div>
    </div>
  );
};

const LogEntry = ({ message }) => {
  const time = new Date(message.timestamp).toLocaleTimeString();
  const isGate = message.eventType.includes('viral');
  const isError = message.eventType.includes('fail');

  return (
    <div className={`log-entry ${isGate ? 'log-gate' : ''} ${isError ? 'log-error' : ''}`}>
      <span className="log-time">{time}</span>
      <span className="log-agent">[{message.agentName}]</span>
      <span className="log-event">{message.eventType}</span>
      {message.data?.error && (
        <span className="log-detail"> — {message.data.error}</span>
      )}
    </div>
  );
};

export default PipelineView;
