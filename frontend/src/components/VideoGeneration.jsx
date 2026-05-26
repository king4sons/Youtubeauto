import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import './VideoGeneration.css';

const VideoGeneration = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('generate');
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [extendedProviders, setExtendedProviders] = useState([]);

  // Short Form State
  const [shortFormData, setShortFormData] = useState({
    prompt: '',
    style: 'trendy'
  });

  // Long Form State
  const [longFormData, setLongFormData] = useState({
    prompt: '',
    style: 'cinematic'
  });

  // Extended Form State (10-15 minutes)
  const [extendedFormData, setExtendedFormData] = useState({
    prompt: '',
    duration: 600, // 10 minutes default
    style: 'documentary',
    autoGenerateSegments: true,
    includeVoiceover: false,
    includeMusic: false,
    musicGenre: 'cinematic',
    segments: []
  });

  // Custom Video State
  const [customVideoData, setCustomVideoData] = useState({
    prompt: '',
    provider: 'veo3',
    format: 'longform',
    duration: 60,
    aspectRatio: '16:9',
    style: 'cinematic'
  });

  // Script-Based State
  const [scriptData, setScriptData] = useState({
    title: '',
    script: '',
    style: 'cinematic',
    voiceId: 'default',
    includeVoiceover: true,
    includeMusic: true,
    musicGenre: 'cinematic'
  });

  // Generation History
  const [history, setHistory] = useState([]);
  const [generationStatus, setGenerationStatus] = useState({});

  useEffect(() => {
    fetchProviders();
    fetchHistory();
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await axios.get('/api/video-generation/providers');
      setProviders(response.data.data);

      const extendedResponse = await axios.get('/api/video-generation/providers/extended');
      setExtendedProviders(extendedResponse.data.data);
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get('/api/video-generation/history?limit=20');
      setHistory(response.data.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  // Generate Short Form
  const handleGenerateShortForm = async (e) => {
    e.preventDefault();
    if (!shortFormData.prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/video-generation/generate-shortform', {
        prompt: shortFormData.prompt,
        style: shortFormData.style
      });

      alert(`Video generation started!\nGeneration ID: ${response.data.generationId}\nEstimated time: ${response.data.estimatedTime}s`);
      setShortFormData({ prompt: '', style: 'trendy' });
      fetchHistory();
    } catch (error) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate Long Form
  const handleGenerateLongForm = async (e) => {
    e.preventDefault();
    if (!longFormData.prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/video-generation/generate-longform', {
        prompt: longFormData.prompt,
        style: longFormData.style
      });

      alert(`Video generation started!\nGeneration ID: ${response.data.generationId}\nEstimated time: ${response.data.estimatedTime}s`);
      setLongFormData({ prompt: '', style: 'cinematic' });
      fetchHistory();
    } catch (error) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate Extended Form (10-15 minutes)
  const handleGenerateExtendedForm = async (e) => {
    e.preventDefault();
    if (!extendedFormData.prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    if (extendedFormData.duration < 600 || extendedFormData.duration > 900) {
      alert('Duration must be between 10-15 minutes (600-900 seconds)');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/video-generation/generate-extended', {
        prompt: extendedFormData.prompt,
        duration: extendedFormData.duration,
        style: extendedFormData.style,
        autoGenerateSegments: extendedFormData.autoGenerateSegments,
        includeVoiceover: extendedFormData.includeVoiceover,
        includeMusic: extendedFormData.includeMusic,
        musicGenre: extendedFormData.musicGenre,
        segments: extendedFormData.segments
      });

      alert(`Extended form video generation started!\nGeneration ID: ${response.data.generationId}\nFormat: ${response.data.format}\nDuration: ${response.data.duration} minutes\nEstimated time: ${response.data.estimatedTime}s`);
      setExtendedFormData({
        prompt: '',
        duration: 600,
        style: 'documentary',
        autoGenerateSegments: true,
        includeVoiceover: false,
        includeMusic: false,
        musicGenre: 'cinematic',
        segments: []
      });
      fetchHistory();
    } catch (error) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate from Script
  const handleGenerateFromScript = async (e) => {
    e.preventDefault();
    if (!scriptData.script.trim()) {
      alert('Please paste your script');
      return;
    }
    if (scriptData.script.trim().length < 100) {
      alert('Script must be at least 100 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/video-generation/generate-from-script', {
        script: scriptData.script,
        title: scriptData.title || 'My YouTube Video',
        style: scriptData.style,
        voiceId: scriptData.voiceId,
        includeVoiceover: scriptData.includeVoiceover,
        includeMusic: scriptData.includeMusic,
        musicGenre: scriptData.musicGenre
      });

      alert(
        `Script-based video generation started!\n` +
        `Title: ${response.data.title}\n` +
        `Generation ID: ${response.data.generationId}\n` +
        `Segments: ${response.data.totalSegments}\n` +
        `Duration: ${response.data.duration} minutes\n` +
        `Provider: ${response.data.provider}\n` +
        `Estimated time: ${response.data.estimatedTime}s`
      );
      setScriptData({
        title: '',
        script: '',
        style: 'cinematic',
        voiceId: 'default',
        includeVoiceover: true,
        includeMusic: true,
        musicGenre: 'cinematic'
      });
      fetchHistory();
    } catch (error) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate Custom Video
  const handleGenerateCustom = async (e) => {
    e.preventDefault();
    if (!customVideoData.prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/video-generation/generate', {
        prompt: customVideoData.prompt,
        provider: customVideoData.provider,
        format: customVideoData.format,
        duration: customVideoData.duration,
        aspectRatio: customVideoData.aspectRatio,
        style: customVideoData.style
      });

      alert(`Video generation started!\nGeneration ID: ${response.data.generationId}\nProvider: ${response.data.provider}\nEstimated time: ${response.data.estimatedTime}s`);
      setCustomVideoData({
        prompt: '',
        provider: 'veo3',
        format: 'longform',
        duration: 60,
        aspectRatio: '16:9',
        style: 'cinematic'
      });
      fetchHistory();
    } catch (error) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Check Status
  const handleCheckStatus = async (generationId) => {
    try {
      const response = await axios.get(`/api/video-generation/${generationId}/status`);
      setGenerationStatus(prev => ({
        ...prev,
        [generationId]: response.data
      }));
    } catch (error) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  // Update duration display for extended form
  const durationMinutes = Math.round(extendedFormData.duration / 60);

  return (
    <div className="video-generation-container">
      <h1>🎬 Video Generation</h1>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'script' ? 'active' : ''}`}
          onClick={() => setActiveTab('script')}
        >
          From Script
        </button>
        <button
          className={`tab ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          Custom Generate
        </button>
        <button 
          className={`tab ${activeTab === 'shortform' ? 'active' : ''}`}
          onClick={() => setActiveTab('shortform')}
        >
          Short-Form (30s)
        </button>
        <button 
          className={`tab ${activeTab === 'longform' ? 'active' : ''}`}
          onClick={() => setActiveTab('longform')}
        >
          Long-Form (1m)
        </button>
        <button 
          className={`tab ${activeTab === 'extended' ? 'active' : ''}`}
          onClick={() => setActiveTab('extended')}
        >
          Extended (10-15m)
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {/* From Script Tab */}
      {activeTab === 'script' && (
        <div className="tab-content">
          <h2>Generate Video from Script</h2>
          <p className="subtitle">
            Paste a full screenplay — chapters are auto-parsed into timed segments.
            Supports format: <code>## 0:00–0:22 — Chapter Title</code>
          </p>

          <form onSubmit={handleGenerateFromScript}>
            <div className="form-group">
              <label>Video Title *</label>
              <input
                type="text"
                value={scriptData.title}
                onChange={(e) => setScriptData({ ...scriptData, title: e.target.value })}
                placeholder="He Stole My House. I Gave Him 6 Months..."
              />
            </div>

            <div className="form-group">
              <label>Full Script *</label>
              <textarea
                value={scriptData.script}
                onChange={(e) => setScriptData({ ...scriptData, script: e.target.value })}
                placeholder="Paste your full screenplay here. Sections starting with ## 0:00–0:22 — Chapter Title will be parsed as timed segments..."
                rows="18"
                style={{ fontFamily: 'monospace', fontSize: '13px' }}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Style</label>
                <select
                  value={scriptData.style}
                  onChange={(e) => setScriptData({ ...scriptData, style: e.target.value })}
                >
                  <option value="cinematic">Cinematic</option>
                  <option value="documentary">Documentary</option>
                  <option value="thriller">Thriller</option>
                  <option value="dramatic">Dramatic</option>
                  <option value="vlog">Vlog</option>
                </select>
              </div>

              <div className="form-group">
                <label>Voice (ElevenLabs)</label>
                <select
                  value={scriptData.voiceId}
                  onChange={(e) => setScriptData({ ...scriptData, voiceId: e.target.value })}
                >
                  <option value="default">Default</option>
                  <option value="adam">Adam (deep, authoritative)</option>
                  <option value="josh">Josh (calm, measured)</option>
                  <option value="arnold">Arnold (strong, confident)</option>
                  <option value="sam">Sam (neutral, clear)</option>
                  <option value="rachel">Rachel (warm, expressive)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Music Genre</label>
                <select
                  value={scriptData.musicGenre}
                  onChange={(e) => setScriptData({ ...scriptData, musicGenre: e.target.value })}
                >
                  <option value="cinematic">Cinematic</option>
                  <option value="tension">Tension</option>
                  <option value="ambient">Ambient</option>
                  <option value="epic">Epic</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={scriptData.includeVoiceover}
                  onChange={(e) => setScriptData({ ...scriptData, includeVoiceover: e.target.checked })}
                />
                Generate AI voiceover from script dialogue
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={scriptData.includeMusic}
                  onChange={(e) => setScriptData({ ...scriptData, includeMusic: e.target.checked })}
                />
                Include background music
              </label>
            </div>

            <button type="submit" className="btn-primary btn-large" disabled={loading}>
              {loading ? 'Parsing & Generating...' : 'Generate Video from Script'}
            </button>
          </form>
        </div>
      )}

      {/* Custom Generate Tab */}
      {activeTab === 'generate' && (
        <div className="tab-content">
          <h2>Generate Custom Video</h2>
          <form onSubmit={handleGenerateCustom}>
            <div className="form-group">
              <label>Video Prompt *</label>
              <textarea
                value={customVideoData.prompt}
                onChange={(e) => setCustomVideoData({ ...customVideoData, prompt: e.target.value })}
                placeholder="Describe your video idea..."
                rows="4"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Provider</label>
                <select
                  value={customVideoData.provider}
                  onChange={(e) => setCustomVideoData({ ...customVideoData, provider: e.target.value })}
                >
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Max: {p.maxDurationMinutes}m)</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Format</label>
                <select
                  value={customVideoData.format}
                  onChange={(e) => setCustomVideoData({ ...customVideoData, format: e.target.value })}
                >
                  <option value="longform">Long-form</option>
                  <option value="shortform">Short-form</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Duration (seconds)</label>
                <input
                  type="number"
                  value={customVideoData.duration}
                  onChange={(e) => setCustomVideoData({ ...customVideoData, duration: parseInt(e.target.value) })}
                  min="10"
                  max="120"
                />
              </div>

              <div className="form-group">
                <label>Aspect Ratio</label>
                <select
                  value={customVideoData.aspectRatio}
                  onChange={(e) => setCustomVideoData({ ...customVideoData, aspectRatio: e.target.value })}
                >
                  <option value="16:9">16:9 (Widescreen)</option>
                  <option value="9:16">9:16 (Portrait)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="4:3">4:3 (Standard)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Style</label>
                <select
                  value={customVideoData.style}
                  onChange={(e) => setCustomVideoData({ ...customVideoData, style: e.target.value })}
                >
                  <option value="cinematic">Cinematic</option>
                  <option value="documentary">Documentary</option>
                  <option value="anime">Anime</option>
                  <option value="realistic">Realistic</option>
                  <option value="3D">3D</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Video'}
            </button>
          </form>
        </div>
      )}

      {/* Short Form Tab */}
      {activeTab === 'shortform' && (
        <div className="tab-content">
          <h2>Generate Short-Form Video (30 seconds)</h2>
          <p className="subtitle">Perfect for TikTok, Instagram Reels, YouTube Shorts</p>
          <form onSubmit={handleGenerateShortForm}>
            <div className="form-group">
              <label>Video Prompt *</label>
              <textarea
                value={shortFormData.prompt}
                onChange={(e) => setShortFormData({ ...shortFormData, prompt: e.target.value })}
                placeholder="Describe your short-form video idea..."
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>Style</label>
              <select
                value={shortFormData.style}
                onChange={(e) => setShortFormData({ ...shortFormData, style: e.target.value })}
              >
                <option value="trendy">Trendy</option>
                <option value="tutorial">Tutorial</option>
                <option value="comedy">Comedy</option>
                <option value="educational">Educational</option>
                <option value="aesthetic">Aesthetic</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Short-Form'}
            </button>
          </form>
        </div>
      )}

      {/* Long Form Tab */}
      {activeTab === 'longform' && (
        <div className="tab-content">
          <h2>Generate Long-Form Video (1 minute)</h2>
          <p className="subtitle">Perfect for YouTube videos and professional content</p>
          <form onSubmit={handleGenerateLongForm}>
            <div className="form-group">
              <label>Video Prompt *</label>
              <textarea
                value={longFormData.prompt}
                onChange={(e) => setLongFormData({ ...longFormData, prompt: e.target.value })}
                placeholder="Describe your long-form video idea..."
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>Style</label>
              <select
                value={longFormData.style}
                onChange={(e) => setLongFormData({ ...longFormData, style: e.target.value })}
              >
                <option value="cinematic">Cinematic</option>
                <option value="documentary">Documentary</option>
                <option value="educational">Educational</option>
                <option value="vlog">Vlog</option>
                <option value="promotional">Promotional</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Long-Form'}
            </button>
          </form>
        </div>
      )}

      {/* Extended Form Tab (10-15 minutes) */}
      {activeTab === 'extended' && (
        <div className="tab-content">
          <h2>🎥 Generate Extended-Form Video (10-15 minutes)</h2>
          <p className="subtitle">Perfect for YouTube videos, courses, documentaries, and long vlogs</p>
          
          <div className="extended-info">
            <div className="info-box">
              <h3>✨ Extended Form Features</h3>
              <ul>
                <li>📊 Automatic segment generation</li>
                <li>🎙️ Professional voiceover support</li>
                <li>🎵 Background music integration</li>
                <li>🎬 Advanced video composition</li>
                <li>⏱️ 10-15 minute duration support</li>
              </ul>
            </div>

            <div className="providers-box">
              <h3>🚀 Available Providers</h3>
              <div className="providers-grid">
                {extendedProviders.map(p => (
                  <div key={p.id} className="provider-card">
                    <strong>{p.name}</strong>
                    <p>Max: {p.maxDurationMinutes}m</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleGenerateExtendedForm}>
            <div className="form-group">
              <label>Video Prompt *</label>
              <textarea
                value={extendedFormData.prompt}
                onChange={(e) => setExtendedFormData({ ...extendedFormData, prompt: e.target.value })}
                placeholder="Describe your extended-form video (10-15 minutes)..."
                rows="4"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Duration: {durationMinutes} minutes</label>
                <input
                  type="range"
                  min="600"
                  max="900"
                  step="60"
                  value={extendedFormData.duration}
                  onChange={(e) => setExtendedFormData({ ...extendedFormData, duration: parseInt(e.target.value) })}
                />
                <small>10-15 minutes (600-900 seconds)</small>
              </div>

              <div className="form-group">
                <label>Style</label>
                <select
                  value={extendedFormData.style}
                  onChange={(e) => setExtendedFormData({ ...extendedFormData, style: e.target.value })}
                >
                  <option value="documentary">Documentary</option>
                  <option value="educational">Educational</option>
                  <option value="vlog">Vlog</option>
                  <option value="cinematic">Cinematic</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="course">Course</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Music Genre</label>
              <select
                value={extendedFormData.musicGenre}
                onChange={(e) => setExtendedFormData({ ...extendedFormData, musicGenre: e.target.value })}
              >
                <option value="cinematic">Cinematic</option>
                <option value="ambient">Ambient</option>
                <option value="epic">Epic</option>
                <option value="uplifting">Uplifting</option>
                <option value="calm">Calm</option>
                <option value="energetic">Energetic</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={extendedFormData.autoGenerateSegments}
                  onChange={(e) => setExtendedFormData({ ...extendedFormData, autoGenerateSegments: e.target.checked })}
                />
                Auto-generate segments
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={extendedFormData.includeVoiceover}
                  onChange={(e) => setExtendedFormData({ ...extendedFormData, includeVoiceover: e.target.checked })}
                />
                Include professional voiceover
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={extendedFormData.includeMusic}
                  onChange={(e) => setExtendedFormData({ ...extendedFormData, includeMusic: e.target.checked })}
                />
                Include background music
              </label>
            </div>

            <button type="submit" className="btn-primary btn-large" disabled={loading}>
              {loading ? 'Generating Extended Video...' : '🎬 Generate Extended-Form Video (10-15m)'}
            </button>
          </form>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="tab-content">
          <h2>Generation History</h2>
          <div className="history-grid">
            {history.length === 0 ? (
              <p>No generations yet</p>
            ) : (
              history.map(item => (
                <div key={item._id} className="history-card">
                  <div className="history-header">
                    <span className="format-badge">{item.format}</span>
                    <span className={`status-badge ${item.status}`}>{item.status}</span>
                  </div>
                  <p className="prompt">{item.prompt.substring(0, 100)}...</p>
                  <p className="provider">Provider: {item.metadata?.providerName}</p>
                  <p className="duration">Duration: {Math.round(item.duration / 60)}m {item.duration % 60}s</p>
                  <p className="date">{new Date(item.createdAt).toLocaleString()}</p>
                  {item.videoUrl && (
                    <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                      View Video
                    </a>
                  )}
                  <button 
                    className="btn-secondary"
                    onClick={() => handleCheckStatus(item._id)}
                  >
                    Check Status
                  </button>
                  {generationStatus[item._id] && (
                    <div className="status-details">
                      <p>Status: {generationStatus[item._id].status}</p>
                      {generationStatus[item._id].error && (
                        <p className="error">Error: {generationStatus[item._id].error}</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGeneration;
