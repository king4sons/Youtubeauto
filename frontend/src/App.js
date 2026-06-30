import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ContentCreator from './components/ContentCreator';
import ContentLibrary from './components/ContentLibrary';
import VideoStudio from './components/VideoStudio';
import IdeaGenerator from './components/IdeaGenerator';
import './App.css';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'create', label: 'Create Content', icon: '+' },
  { id: 'library', label: 'Library', icon: '▤' },
  { id: 'video', label: 'Video Studio', icon: '▶' },
  { id: 'ideas', label: 'Idea Generator', icon: '✦' }
];

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // On mount, verify stored token is still valid
  useEffect(() => {
    const token = localStorage.getItem('ya_token');
    const email = localStorage.getItem('ya_email');
    if (!token) { setChecking(false); return; }

    axios.post('/api/auth/verify', {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (res.data.valid) { setAuthed(true); setUserEmail(email || ''); }
        else { localStorage.removeItem('ya_token'); localStorage.removeItem('ya_email'); }
      })
      .catch(() => { localStorage.removeItem('ya_token'); localStorage.removeItem('ya_email'); })
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = (email) => {
    setUserEmail(email);
    setAuthed(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('ya_token');
    localStorage.removeItem('ya_email');
    setAuthed(false);
    setUserEmail('');
    setActiveTab('dashboard');
  };

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!authed) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">▶</span>
          <span className="logo-text">YoutubeAuto</span>
        </div>
        <nav className="sidebar-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div className="status-dot green" />
              <span>AI Studio Ready</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: '4px 0', fontFamily: 'inherit' }}
            title="Sign out"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === 'create' && <ContentCreator />}
        {activeTab === 'library' && <ContentLibrary />}
        {activeTab === 'video' && <VideoStudio />}
        {activeTab === 'ideas' && <IdeaGenerator />}
      </main>
    </div>
  );
}
