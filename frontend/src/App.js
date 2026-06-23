import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState('dashboard');

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
          <div className="status-dot green" />
          <span>AI Studio Ready</span>
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
