import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProjectCreator from './ProjectCreator';
import PipelineView from './PipelineView';
import GrowthTechStudio from './GrowthTechStudio';
import './StudioDashboard.css';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const STATUS_COLORS = {
  pending: '#6B7280',
  processing: '#3B82F6',
  completed: '#10B981',
  failed: '#EF4444',
  blocked: '#F59E0B'
};

const NICHES = [
  { id: 'reckoning', label: 'The Reckoning Files', icon: '⚡', accent: '#DC2626' },
  { id: 'growthtech', label: 'GrowthTech Studio', icon: '🚀', accent: '#00FF88' }
];

const StudioDashboard = () => {
  const [view, setView] = useState('dashboard'); // dashboard | create | pipeline | growthtech
  const [activeNiche, setActiveNiche] = useState('reckoning');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const [projectsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/projects?limit=20&userId=dev-user`),
        axios.get(`${API_BASE}/projects/stats/overview?userId=dev-user`)
      ]);
      setProjects(projectsRes.data.data || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openPipeline = (project) => {
    setSelectedProject(project);
    setView('pipeline');
  };

  if (view === 'create') {
    return (
      <ProjectCreator
        onBack={() => setView('dashboard')}
        onCreated={(project) => {
          fetchDashboard();
          openPipeline(project);
        }}
      />
    );
  }

  if (view === 'pipeline' && selectedProject) {
    return (
      <PipelineView
        project={selectedProject}
        onBack={() => { setView('dashboard'); fetchDashboard(); }}
      />
    );
  }

  if (view === 'growthtech') {
    return (
      <div className="studio-dashboard">
        <header className="studio-header">
          <div className="studio-brand">
            <span className="brand-icon">🚀</span>
            <h1>GrowthTech Studio</h1>
            <span className="brand-tagline" style={{ color: '#00CC6A' }}>@sina.growthtech · Raw · Direct · Viral</span>
          </div>
          <button className="btn-back-niche" onClick={() => setView('dashboard')}>← All Studios</button>
        </header>
        <NichePicker active={activeNiche} onChange={(n) => {
          setActiveNiche(n);
          setView(n === 'growthtech' ? 'growthtech' : 'dashboard');
        }} />
        <GrowthTechStudio onCreateProject={(project) => {
          fetchDashboard();
          openPipeline(project);
        }} />
      </div>
    );
  }

  return (
    <div className="studio-dashboard">
      <header className="studio-header">
        <div className="studio-brand">
          <span className="brand-icon">⚡</span>
          <h1>Reckoning Studio AI</h1>
          <span className="brand-tagline">Cinematic Intelligence Engine</span>
        </div>
        <button className="btn-create" onClick={() => setView('create')}>
          + New Project
        </button>
      </header>

      <NichePicker active={activeNiche} onChange={(n) => {
        setActiveNiche(n);
        if (n === 'growthtech') setView('growthtech');
      }} />

      {stats && (
        <div className="stats-grid">
          <StatCard label="Total Projects" value={stats.totalProjects} icon="🎬" />
          <StatCard label="Completed" value={stats.completed} icon="✅" color="#10B981" />
          <StatCard label="Processing" value={stats.processing} icon="⚙️" color="#3B82F6" />
          <StatCard label="Blocked" value={stats.blocked} icon="🚫" color="#F59E0B" />
        </div>
      )}

      {stats?.viralThresholds && (
        <div className="viral-gates-banner">
          <span className="gate-label">VIRAL GATE REQUIREMENTS</span>
          <span className="gate-metric">Viral Score ≥ {stats.viralThresholds.VIRAL_SCORE}</span>
          <span className="gate-separator">•</span>
          <span className="gate-metric">Retention Score ≥ {stats.viralThresholds.RETENTION_SCORE}</span>
          <span className="gate-separator">•</span>
          <span className="gate-metric">Story Score ≥ {stats.viralThresholds.STORY_SCORE}</span>
        </div>
      )}

      <section className="projects-section">
        <div className="section-header">
          <h2>Projects</h2>
          <span className="project-count">{projects.length} total</span>
        </div>

        {loading ? (
          <div className="loading-grid">
            {[1, 2, 3].map(i => <div key={i} className="project-card skeleton" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <p>No projects yet. Create your first cinematic video.</p>
            <button className="btn-create large" onClick={() => setView('create')}>
              Create First Project
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(project => (
              <ProjectCard
                key={project._id}
                project={project}
                onOpen={() => openPipeline(project)}
              />
            ))}
          </div>
        )}
      </section>

      {stats?.topProjects?.length > 0 && (
        <section className="top-projects-section">
          <h2>Top Viral Projects</h2>
          <div className="top-list">
            {stats.topProjects.map((p, i) => (
              <div key={p._id} className="top-item">
                <span className="rank">#{i + 1}</span>
                <span className="top-title">{p.title}</span>
                <div className="top-scores">
                  <span className="score viral">V: {p.viralScore?.viralScore || 0}</span>
                  <span className="score retention">R: {p.viralScore?.retentionScore || 0}</span>
                  <span className="score story">S: {p.viralScore?.storyScore || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon, color = '#6B7280' }) => (
  <div className="stat-card" style={{ '--accent': color }}>
    <span className="stat-icon">{icon}</span>
    <span className="stat-value" style={{ color }}>{value}</span>
    <span className="stat-label">{label}</span>
  </div>
);

const ProjectCard = ({ project, onOpen }) => {
  const statusColor = STATUS_COLORS[project.pipelineStatus] || '#6B7280';
  const durationMin = Math.round(project.targetDuration / 60);
  const vs = project.viralScore;

  return (
    <div className="project-card" onClick={onOpen}>
      <div className="project-card-header">
        <div className="status-dot" style={{ background: statusColor }} />
        <span className="project-status">{project.pipelineStatus}</span>
        <span className="project-duration">{durationMin}m</span>
      </div>

      <h3 className="project-title">{project.title}</h3>
      <p className="project-concept">{project.concept?.substring(0, 80)}...</p>

      {vs && vs.viralScore > 0 && (
        <div className="score-row">
          <ScorePill label="V" value={vs.viralScore} threshold={90} />
          <ScorePill label="R" value={vs.retentionScore} threshold={90} />
          <ScorePill label="S" value={vs.storyScore} threshold={90} />
        </div>
      )}

      <div className="project-meta">
        <span className="meta-item">{project.totalScenes || 0} scenes</span>
        <span className="meta-separator">•</span>
        <span className="meta-item">{(project.targetPlatforms || []).join(', ')}</span>
      </div>

      <div className="project-stage">
        {project.currentStage && (
          <span className="stage-badge">{project.currentStage.replace(/_/g, ' ')}</span>
        )}
      </div>
    </div>
  );
};

const ScorePill = ({ label, value, threshold }) => {
  const passed = value >= threshold;
  return (
    <span className={`score-pill ${passed ? 'pass' : 'fail'}`}>
      {label}: {value}
    </span>
  );
};

const NichePicker = ({ active, onChange }) => (
  <div className="niche-picker">
    {NICHES.map(n => (
      <button
        key={n.id}
        className={`niche-tab ${active === n.id ? 'active' : ''}`}
        style={active === n.id ? { '--niche-accent': n.accent } : {}}
        onClick={() => onChange(n.id)}
      >
        <span className="niche-icon">{n.icon}</span>
        <span className="niche-label">{n.label}</span>
      </button>
    ))}
  </div>
);

export default StudioDashboard;
