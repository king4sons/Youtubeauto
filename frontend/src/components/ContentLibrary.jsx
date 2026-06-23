import React, { useState, useEffect } from 'react';
import axios from 'axios';

const STATUS_BADGE = {
  draft: 'badge-gray',
  script_ready: 'badge-blue',
  generating: 'badge-yellow',
  completed: 'badge-green',
  failed: 'badge-red'
};

const PLATFORM_ICONS = { youtube: '▶', tiktok: '♪', instagram_reels: '◎', youtube_shorts: '▸' };

export default function ContentLibrary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({ platform: '', contentType: '' });
  const [polling, setPolling] = useState({});

  useEffect(() => {
    fetchContent();
  }, [filter]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.platform) params.append('platform', filter.platform);
      if (filter.contentType) params.append('contentType', filter.contentType);
      const res = await axios.get(`/api/content?${params}`);
      setItems(res.data.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const syncStatus = async (contentId) => {
    setPolling(p => ({ ...p, [contentId]: true }));
    try {
      const res = await axios.get(`/api/content/${contentId}/status`);
      setItems(prev => prev.map(i => i._id === contentId ? { ...i, video: { ...i.video, ...res.data } } : i));
      if (selected?._id === contentId) {
        setSelected(prev => ({ ...prev, video: { ...prev.video, ...res.data } }));
      }
    } catch {}
    setPolling(p => ({ ...p, [contentId]: false }));
  };

  const deleteContent = async (contentId) => {
    if (!window.confirm('Delete this content?')) return;
    try {
      await axios.delete(`/api/content/${contentId}`);
      setItems(prev => prev.filter(i => i._id !== contentId));
      if (selected?._id === contentId) setSelected(null);
    } catch {}
  };

  return (
    <div>
      <div className="page-header">
        <h1>Content Library</h1>
        <p>All your AI-generated content in one place</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select style={{ width: 'auto' }} value={filter.platform} onChange={e => setFilter(f => ({ ...f, platform: e.target.value }))}>
          <option value="">All Platforms</option>
          <option value="youtube">YouTube</option>
          <option value="tiktok">TikTok</option>
          <option value="instagram_reels">Instagram Reels</option>
          <option value="youtube_shorts">YouTube Shorts</option>
        </select>
        <select style={{ width: 'auto' }} value={filter.contentType} onChange={e => setFilter(f => ({ ...f, contentType: e.target.value }))}>
          <option value="">All Types</option>
          <option value="shortform">Short-form</option>
          <option value="longform">Long-form</option>
          <option value="extended">Extended</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={fetchContent}>Refresh</button>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* List */}
        <div style={{ flex: selected ? '0 0 360px' : 1 }}>
          {loading ? (
            <div className="loading-overlay"><div className="spinner" /><span>Loading...</span></div>
          ) : items.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">▤</div>
                <h3>No content found</h3>
                <p>Create your first AI video to see it here</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(item => (
                <div
                  key={item._id}
                  className="card"
                  style={{ cursor: 'pointer', border: selected?._id === item._id ? '1px solid var(--accent)' : undefined, padding: 14 }}
                  onClick={() => setSelected(item)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{PLATFORM_ICONS[item.platform] || '▶'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {item.platform} · {item.contentType} · {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`badge ${STATUS_BADGE[item.video?.status] || 'badge-gray'}`}>{item.video?.status || 'draft'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ flex: 1 }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.platform} · {selected.contentType}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteContent(selected._id)}>Delete</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>✕</button>
                </div>
              </div>

              {/* Video status */}
              <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>VIDEO STATUS</div>
                    <span className={`badge ${STATUS_BADGE[selected.video?.status] || 'badge-gray'}`}>{selected.video?.status || 'draft'}</span>
                  </div>
                  {['generating', 'script_ready'].includes(selected.video?.status) && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => syncStatus(selected._id)}
                      disabled={polling[selected._id]}
                    >
                      {polling[selected._id] ? <div className="spinner" /> : '↻ Check Status'}
                    </button>
                  )}
                </div>
                {selected.video?.provider && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>Provider: {selected.video.provider}</div>
                )}
                {selected.video?.videoUrl && (
                  <div style={{ marginTop: 10 }}>
                    <video controls style={{ width: '100%', borderRadius: 6 }} src={selected.video.videoUrl} />
                    <a href={selected.video.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
                      Download Video
                    </a>
                  </div>
                )}
              </div>

              {/* Script */}
              {selected.script?.hook && (
                <div style={{ marginBottom: 16 }}>
                  <div className="script-label">Hook</div>
                  <div className="script-block">{selected.script.hook}</div>
                  <div className="script-label">CTA</div>
                  <div className="script-block">{selected.script.callToAction}</div>
                </div>
              )}

              {/* SEO */}
              {selected.seo?.title && (
                <div>
                  <div className="divider" />
                  <div className="card-title" style={{ marginBottom: 10 }}>SEO</div>
                  <div style={{ fontSize: 13 }}>
                    <div style={{ marginBottom: 6 }}><strong>Title:</strong> {selected.seo.title}</div>
                    {selected.seo.tags?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {selected.seo.tags.map((t, i) => <span key={i} className="badge badge-blue">{t}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
