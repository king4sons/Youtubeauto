import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const VideoAnalysis = () => {
  const [url, setUrl] = useState('');
  const [maxFrames, setMaxFrames] = useState(60);
  const [noWhisper, setNoWhisper] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysisId, setAnalysisId] = useState(null);
  const [status, setStatus] = useState(null);
  const [index, setIndex] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [selectedFrame, setSelectedFrame] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  const startAnalysis = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setStatus(null);
    setIndex([]);
    setTranscript('');
    setSelectedFrame(null);
    setAnalysisId(null);
    clearInterval(pollRef.current);

    try {
      const res = await axios.post('/api/video-analysis/watch', { url: url.trim(), maxFrames, noWhisper });
      setAnalysisId(res.data.analysisId);
      setStatus({ status: 'processing' });

      pollRef.current = setInterval(async () => {
        try {
          const s = await axios.get(`/api/video-analysis/${res.data.analysisId}/status`);
          setStatus(s.data);

          if (s.data.status === 'completed') {
            clearInterval(pollRef.current);
            const [idxRes, txRes] = await Promise.all([
              axios.get(`/api/video-analysis/${res.data.analysisId}/index`),
              axios.get(`/api/video-analysis/${res.data.analysisId}/transcript`)
            ]);
            setIndex(idxRes.data.frames);
            setTranscript(txRes.data.transcript);
          } else if (s.data.status === 'failed') {
            clearInterval(pollRef.current);
          }
        } catch {
          clearInterval(pollRef.current);
        }
      }, 3000);
    } catch (error) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const frameUrl = (frameName) =>
    `/api/video-analysis/${analysisId}/frames/${frameName}`;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-generation-container">
      <h1>Watch & Analyze Video</h1>
      <p className="subtitle">
        Download any video, extract key frames, and get a transcript — grounded in both visuals and audio.
      </p>

      <form onSubmit={startAnalysis}>
        <div className="form-group">
          <label>Video URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtu.be/…"
            required
          />
          <small>Supports YouTube, Instagram, X, Vimeo, and 1000+ yt-dlp sites</small>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Max frames: {maxFrames}</label>
            <input
              type="range"
              min="10"
              max="120"
              step="10"
              value={maxFrames}
              onChange={(e) => setMaxFrames(parseInt(e.target.value))}
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={noWhisper}
                onChange={(e) => setNoWhisper(e.target.checked)}
              />
              Captions only (skip Whisper transcription)
            </label>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading || status?.status === 'processing'}>
          {loading || status?.status === 'processing' ? 'Analyzing…' : 'Watch Video'}
        </button>
      </form>

      {status && (
        <div className="extended-info" style={{ marginTop: '1.5rem' }}>
          <div className="info-box">
            <h3>
              {status.status === 'processing' && 'Processing…'}
              {status.status === 'completed' && `Done — ${status.frameCount} frames, ${status.wordCount} words`}
              {status.status === 'failed' && 'Analysis failed'}
            </h3>
            {status.error && <p className="error">{status.error}</p>}
            {status.status === 'processing' && (
              <p>Downloading video, extracting frames, and transcribing audio…</p>
            )}
          </div>
        </div>
      )}

      {transcript && (
        <div className="tab-content" style={{ marginTop: '1.5rem' }}>
          <h2>Transcript</h2>
          <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#f5f5f5', padding: '1rem', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
            {transcript}
          </div>
        </div>
      )}

      {index.length > 0 && (
        <div className="tab-content" style={{ marginTop: '1.5rem' }}>
          <h2>Frames ({index.length})</h2>
          {selectedFrame && (
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <img
                src={frameUrl(selectedFrame.file.replace('frames/', ''))}
                alt={`Frame at ${formatTime(selectedFrame.t)}`}
                style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '4px' }}
              />
              <p>Frame {selectedFrame.frame} — {formatTime(selectedFrame.t)}</p>
            </div>
          )}
          <div className="history-grid">
            {index.map((f) => (
              <div
                key={f.frame}
                className="history-card"
                style={{ cursor: 'pointer', padding: '0.5rem', textAlign: 'center' }}
                onClick={() => setSelectedFrame(f)}
              >
                <img
                  src={frameUrl(f.file.replace('frames/', ''))}
                  alt={`Frame ${f.frame}`}
                  style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '2px' }}
                />
                <small>{formatTime(f.t)}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoAnalysis;
