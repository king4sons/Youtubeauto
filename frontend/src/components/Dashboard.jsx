import React, { useState, useEffect } from 'react';
import axios from 'axios';

const STAT_CARDS = [
  { label: 'Total Content', key: 'total', icon: '▤', color: '#6366f1' },
  { label: 'Videos Generated', key: 'generated', icon: '▶', color: '#22c55e' },
  { label: 'In Progress', key: 'generating', icon: '⟳', color: '#eab308' },
  { label: 'Completed', key: 'completed', icon: '✓', color: '#22c55e' }
];

const PLATFORM_ICONS = {
  youtube: '▶',
  tiktok: '♪',
  instagram_reels: '◎',
  youtube_shorts: '▸'
};

const STATUS_BADGE = {
  draft: 'badge-gray',
  script_ready: 'badge-blue',
  generating: 'badge-yellow',
  completed: 'badge-green',
  failed: 'badge-red'
};

export default function Dashboard({ onNavigate }) {
  const [content, setContent] = useState([]);
  const [stats, setStats] = useState({ total: 0, generated: 0, generating: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/content');
      const items = res.data.data || [];
      setContent(items.slice(0, 6));
      setStats({
        total: items.length,
        generated: items.filter(i => i.video?.status !== 'draft').length,
        generating: items.filter(i => i.video?.status === 'generating').length,
        completed: items.filter(i => i.video?.status === 'completed').length
      });
    } catch {
      // No content yet
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>AI Content Studio</h1>
        <p>Create, generate, and publish YouTube & social media content with AI</p>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {STAT_CARDS.map(s => (
          <div className="card" key={s.key} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8, color: s.color }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{stats[s.key]}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">Quick Actions</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={() => onNavigate('create')}>
            + New Content
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('ideas')}>
            ✦ Generate Ideas
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('video')}>
            ▶ Video Studio
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('library')}>
            ▤ View Library
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">How It Works</div>
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { step: '1', title: 'Pick Your Topic', desc: 'Enter any topic or niche for your video', icon: '✦' },
            { step: '2', title: 'AI Writes Script', desc: 'Claude AI generates hook, body & CTA', icon: '✎' },
            { step: '3', title: 'Choose AI Model', desc: 'Pick from Kling, Veo, Runway, LTX & more', icon: '▶' },
            { step: '4', title: 'Generate & Publish', desc: 'Video is created and ready to post', icon: '↑' }
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', gap: 12, alignItems: 'flex-start', padding: '0 16px', borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{s.step}</div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent content */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title" style={{ margin: 0 }}>Recent Content</div>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('library')}>View All</button>
        </div>

        {loading ? (
          <div className="loading-overlay"><div className="spinner" /><span>Loading...</span></div>
        ) : content.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">▶</div>
            <h3>No content yet</h3>
            <p>Create your first AI video to get started</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => onNavigate('create')}>
              + Create Content
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {content.map(item => (
              <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8 }}>
                <span style={{ fontSize: 18 }}>{PLATFORM_ICONS[item.platform] || '▶'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.platform} · {item.contentType} · {new Date(item.createdAt).toLocaleDateString()}</div>
                </div>
                <span className={`badge ${STATUS_BADGE[item.video?.status] || 'badge-gray'}`}>
                  {item.video?.status || 'draft'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
