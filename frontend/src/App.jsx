import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import VideoGeneration from './components/VideoGeneration';
import VideoAnalysis from './components/VideoAnalysis';

const App = () => {
  return (
    <Router>
      <nav style={{ padding: '1rem', borderBottom: '1px solid #ddd', display: 'flex', gap: '1.5rem' }}>
        <NavLink to="/" end style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })}>
          Video Generation
        </NavLink>
        <NavLink to="/video-analysis" style={({ isActive }) => ({ fontWeight: isActive ? 'bold' : 'normal' })}>
          Watch &amp; Analyze
        </NavLink>
      </nav>

      <main style={{ padding: '1.5rem' }}>
        <Routes>
          <Route path="/" element={<VideoGeneration />} />
          <Route path="/video-analysis" element={<VideoAnalysis />} />
        </Routes>
      </main>
    </Router>
  );
};

export default App;
