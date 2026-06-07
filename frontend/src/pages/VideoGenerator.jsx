import React, { useState, useEffect } from 'react'
import { FiVideo, FiZap, FiRefreshCw, FiPlay } from 'react-icons/fi'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function VideoGenerator() {
  const [projects, setProjects] = useState([])
  const [videos, setVideos] = useState([])
  const [shorts, setShorts] = useState([])
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({ project_id: '', title: '', style: 'cinematic', resolution: '1920x1080', duration: 600 })

  useEffect(() => { api.get('/projects/').then(r => setProjects(r.data)).catch(() => {}) }, [])

  useEffect(() => {
    if (!form.project_id) return
    const fetchVideos = () => {
      api.get(`/videos/project/${form.project_id}`).then(r => setVideos(r.data)).catch(() => {})
      api.get(`/videos/project/${form.project_id}/shorts`).then(r => setShorts(r.data)).catch(() => {})
    }
    fetchVideos()
    const interval = setInterval(fetchVideos, 3000)
    return () => clearInterval(interval)
  }, [form.project_id])

  async function handleGenerate(e) {
    e.preventDefault()
    setGenerating(true)
    try {
      await api.post('/videos/generate', {
        ...form,
        project_id: Number(form.project_id),
        duration: Number(form.duration),
      })
      toast.success('Video pipeline started!')
    } catch { toast.error('Failed to start pipeline') }
    finally { setGenerating(false) }
  }

  async function generateShorts(videoId) {
    try {
      await api.post(`/videos/${videoId}/generate-shorts`)
      toast.success('Shorts generated for all platforms!')
      if (form.project_id) {
        api.get(`/videos/project/${form.project_id}/shorts`).then(r => setShorts(r.data)).catch(() => {})
      }
    } catch { toast.error('Failed to generate shorts') }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FiVideo className="text-amber-500" /> Video Generation Pipeline
        </h1>
        <p className="text-gray-500 text-sm mt-1">AI cinematic video creation — 10 to 20 minutes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="studio-card p-6">
          <h3 className="font-semibold text-white mb-4">Configure Video</h3>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Project *</label>
              <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })} className="studio-select" required>
                <option value="">Select project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Video Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="studio-input" placeholder="Episode title" required />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Visual Style</label>
              <select value={form.style} onChange={e => setForm({ ...form, style: e.target.value })} className="studio-select">
                {['cinematic', 'documentary', 'noir', 'epic', 'indie', 'dark-fantasy'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Resolution</label>
              <select value={form.resolution} onChange={e => setForm({ ...form, resolution: e.target.value })} className="studio-select">
                <option value="1920x1080">1080p — YouTube Standard</option>
                <option value="3840x2160">4K Ultra HD</option>
                <option value="1080x1920">9:16 Vertical — Shorts/Reels</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">
                Duration — {Math.round(form.duration / 60)} min
              </label>
              <input
                type="range" min={600} max={1200} step={60}
                value={form.duration}
                onChange={e => setForm({ ...form, duration: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>10 min</span><span>20 min</span>
              </div>
            </div>
            <button type="submit" disabled={generating || !form.project_id} className="studio-btn w-full flex items-center justify-center gap-2">
              {generating
                ? <><FiRefreshCw className="animate-spin" /> Starting Pipeline...</>
                : <><FiZap /> Generate Video</>}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="studio-card p-6">
            <h3 className="font-semibold text-white mb-4">Video Queue</h3>
            {videos.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <FiVideo size={40} className="mx-auto mb-3" />
                <p className="text-sm">No videos yet. Start the pipeline above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {videos.map(v => (
                  <div key={v.id} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-white font-medium">{v.title}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{v.resolution} · {Math.round((v.duration || 0) / 60)} min</div>
                      </div>
                      <span className={`status-badge status-${v.status}`}>{v.status}</span>
                    </div>
                    {v.status === 'processing' && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{v.pipeline_stage}</span>
                          <span>{v.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-1000"
                            style={{ width: `${v.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {v.status === 'completed' && (
                      <div className="flex gap-2 mt-3">
                        <button className="studio-btn-outline text-xs px-3 py-1.5 flex items-center gap-1">
                          <FiPlay size={12} /> Preview
                        </button>
                        <button onClick={() => generateShorts(v.id)} className="studio-btn text-xs px-3 py-1.5 flex items-center gap-1">
                          <FiZap size={12} /> Generate Shorts
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {shorts.length > 0 && (
            <div className="studio-card p-5">
              <h3 className="font-semibold text-white mb-3">Generated Shorts</h3>
              <div className="grid grid-cols-2 gap-3">
                {shorts.map(s => (
                  <div key={s.id} className="bg-[#111] border border-[#2a2a2a] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium capitalize">{s.platform}</span>
                      <span className={`status-badge status-${s.status}`}>{s.status}</span>
                    </div>
                    <div className="text-gray-500 text-xs">{s.duration}s · {s.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
