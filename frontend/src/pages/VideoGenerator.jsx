import React, { useState, useEffect } from 'react'
import { FiVideo, FiZap, FiRefreshCw, FiPlay, FiStar, FiCheck, FiSettings } from 'react-icons/fi'
import api from '../utils/api'
import toast from 'react-hot-toast'

const PROVIDER_COLORS = {
  veo3:   { bg: '#4285F415', border: '#4285F440', color: '#4285F4', name: 'Google Veo 3' },
  sora:   { bg: '#10a37f15', border: '#10a37f40', color: '#10a37f', name: 'OpenAI Sora' },
  runway: { bg: '#6366f115', border: '#6366f140', color: '#6366f1', name: 'Runway Gen-4' },
  kling:  { bg: '#f59e0b15', border: '#f59e0b40', color: '#f59e0b', name: 'Kling AI' },
  luma:   { bg: '#ec489915', border: '#ec489940', color: '#ec4899', name: 'Luma Dream Machine' },
}

const NARRATIVE_PRESETS = [
  { id: 'betrayal_revenge', label: 'Betrayal & Revenge', icon: '⚔', desc: '2M–15M avg views', recommended: ['sora','kling','veo3'] },
  { id: 'cinematic_documentary', label: 'Documentary', icon: '📽', desc: 'High CPM', recommended: ['veo3','runway'] },
  { id: 'dark_fantasy', label: 'Dark Fantasy', icon: '⚡', desc: 'Strong retention', recommended: ['veo3','sora','luma'] },
]

function ProviderCard({ provider, selected, onToggle, recommended }) {
  const colors = PROVIDER_COLORS[provider.id] || { bg: '#ffffff10', border: '#ffffff20', color: '#fff', name: provider.name }
  const isSelected = selected.includes(provider.id)
  return (
    <div
      onClick={() => onToggle(provider.id)}
      className="p-4 rounded-xl border cursor-pointer transition-all select-none relative overflow-hidden"
      style={isSelected
        ? { borderColor: colors.color, background: colors.bg }
        : { borderColor: '#2a2a2a', background: '#111' }}
    >
      {recommended && (
        <div className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: colors.bg, color: colors.color }}>
          Recommended
        </div>
      )}
      <div className="flex items-start justify-between mb-2">
        <div className="text-white font-semibold text-sm">{provider.name}</div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ml-2 ${isSelected ? 'border-current bg-current' : 'border-gray-600'}`}
          style={isSelected ? { borderColor: colors.color, background: colors.color } : {}}>
          {isSelected && <FiCheck size={11} className="text-black" />}
        </div>
      </div>
      <div className="flex items-center gap-1 mb-2">
        {[...Array(5)].map((_, i) => (
          <FiStar key={i} size={10} className={i < Math.floor(provider.grade / 2) ? 'fill-current' : ''} style={{ color: colors.color, opacity: i < Math.floor(provider.grade / 2) ? 1 : 0.25 }} />
        ))}
        <span className="text-xs ml-1 font-bold" style={{ color: colors.color }}>{provider.grade_label}</span>
      </div>
      <div className="text-gray-500 text-xs italic mb-2">{provider.tagline}</div>
      <div className="space-y-0.5">
        {provider.strengths.slice(0, 3).map((s, i) => (
          <div key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
            <span style={{ color: colors.color }}>›</span> {s}
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
        <span className="text-gray-600 text-xs">Max {provider.max_duration}s clips</span>
        <span className="text-xs font-medium" style={{ color: colors.color }}>${provider.cost_per_second}/sec</span>
      </div>
    </div>
  )
}

export default function VideoGenerator() {
  const [providers, setProviders] = useState([])
  const [projects, setProjects] = useState([])
  const [videos, setVideos] = useState([])
  const [shorts, setShorts] = useState([])
  const [selectedProviders, setSelectedProviders] = useState(['veo3', 'kling', 'runway'])
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('single')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [form, setForm] = useState({
    project_id: '', title: '', style: 'cinematic', resolution: '1920x1080',
    duration: 720, provider_id: 'veo3',
    enable_motion_brush: false, enable_character_consistency: true,
    enable_lip_sync: false, enable_camera_path: false,
  })

  useEffect(() => {
    api.get('/providers/video').then(r => setProviders(r.data)).catch(() => {})
    api.get('/projects/').then(r => setProjects(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.project_id) return
    const fetchAll = () => {
      api.get(`/videos/project/${form.project_id}`).then(r => setVideos(r.data)).catch(() => {})
      api.get(`/videos/project/${form.project_id}/shorts`).then(r => setShorts(r.data)).catch(() => {})
    }
    fetchAll()
    const iv = setInterval(fetchAll, 3000)
    return () => clearInterval(iv)
  }, [form.project_id])

  function toggleProvider(id) {
    setSelectedProviders(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  function applyPreset(preset) {
    setSelectedPreset(preset.id)
    setSelectedProviders(preset.recommended)
    setActiveTab('multi')
  }

  async function handleGenerate(e) {
    e.preventDefault()
    if (!form.project_id) return toast.error('Select a project')
    setGenerating(true)
    try {
      if (activeTab === 'multi') {
        if (selectedProviders.length === 0) return toast.error('Select at least one provider')
        await api.post('/videos/generate-multi-provider', {
          project_id: Number(form.project_id),
          title: form.title,
          provider_chain: selectedProviders,
          style: form.style,
          resolution: form.resolution,
          duration: Number(form.duration),
          narrative_preset: selectedPreset,
          enable_motion_brush: form.enable_motion_brush,
          enable_camera_path: form.enable_camera_path,
          enable_character_consistency: form.enable_character_consistency,
          enable_lip_sync: form.enable_lip_sync,
        })
        toast.success(`Multi-provider pipeline started (${selectedProviders.join(' → ')})`)
      } else {
        await api.post('/videos/generate', {
          project_id: Number(form.project_id),
          title: form.title,
          style: form.style,
          resolution: form.resolution,
          duration: Number(form.duration),
        })
        toast.success('Video pipeline started!')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start pipeline')
    } finally {
      setGenerating(false)
    }
  }

  async function generateShorts(videoId) {
    try {
      await api.post(`/videos/${videoId}/generate-shorts`)
      toast.success('Shorts generated for all 4 platforms!')
      if (form.project_id) api.get(`/videos/project/${form.project_id}/shorts`).then(r => setShorts(r.data))
    } catch { toast.error('Failed') }
  }

  const primaryProvider = providers.find(p => p.id === form.provider_id)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FiVideo className="text-amber-500" /> Video Generation Pipeline
        </h1>
        <p className="text-gray-500 text-sm mt-1">AI cinematic video creation with the world's top generators</p>
      </div>

      {/* Narrative Presets */}
      <div className="studio-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white text-sm">Narrative Presets</h3>
          <span className="text-gray-500 text-xs">Auto-selects optimal provider chain</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {NARRATIVE_PRESETS.map(preset => (
            <button key={preset.id} onClick={() => applyPreset(preset)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedPreset === preset.id
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#111]'
              }`}>
              <div className="text-2xl mb-1">{preset.icon}</div>
              <div className="text-white text-sm font-semibold">{preset.label}</div>
              <div className="text-gray-500 text-xs mt-0.5">{preset.desc}</div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {preset.recommended.map(pid => (
                  <span key={pid} className="text-xs px-1.5 py-0.5 rounded" style={{ background: PROVIDER_COLORS[pid]?.bg, color: PROVIDER_COLORS[pid]?.color }}>
                    {pid}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config */}
        <div className="studio-card p-6">
          <div className="flex gap-1 mb-5 p-1 bg-[#0a0a0a] rounded-lg">
            {[['single', 'Single Provider'], ['multi', 'Multi-Provider Chain']].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold transition-all ${activeTab === id ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>

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

            {activeTab === 'single' ? (
              <div>
                <label className="text-gray-400 text-sm block mb-1">Provider</label>
                <select value={form.provider_id} onChange={e => setForm({ ...form, provider_id: e.target.value })} className="studio-select">
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name} — {p.grade_label}</option>)}
                </select>
                {primaryProvider && (
                  <div className="mt-2 p-3 rounded-lg text-xs space-y-1" style={{ background: PROVIDER_COLORS[primaryProvider.id]?.bg, borderColor: PROVIDER_COLORS[primaryProvider.id]?.border, border: '1px solid' }}>
                    <div className="font-semibold" style={{ color: PROVIDER_COLORS[primaryProvider.id]?.color }}>{primaryProvider.tagline}</div>
                    {primaryProvider.strengths.slice(0,2).map((s, i) => <div key={i} className="text-gray-400">· {s}</div>)}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="text-gray-400 text-sm block mb-2">Provider Chain ({selectedProviders.length} selected)</label>
                <div className="text-gray-500 text-xs mb-2">
                  {selectedProviders.length > 0 ? selectedProviders.map(id => PROVIDER_COLORS[id]?.name || id).join(' → ') : 'Select providers below'}
                </div>
              </div>
            )}

            <div>
              <label className="text-gray-400 text-sm block mb-1">Visual Style</label>
              <select value={form.style} onChange={e => setForm({ ...form, style: e.target.value })} className="studio-select">
                {['cinematic', 'documentary', 'noir', 'epic', 'dark-fantasy', 'thriller'].map(s => <option key={s}>{s}</option>)}
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
              <label className="text-gray-400 text-sm block mb-1">Duration — {Math.round(form.duration / 60)} min</label>
              <input type="range" min={600} max={1200} step={60} value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} className="w-full accent-amber-500" />
              <div className="flex justify-between text-xs text-gray-600 mt-1"><span>10 min</span><span>20 min</span></div>
            </div>

            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1 text-gray-500 text-xs hover:text-white transition-colors">
              <FiSettings size={12} /> Advanced Options {showAdvanced ? '▴' : '▾'}
            </button>

            {showAdvanced && (
              <div className="space-y-2 p-3 bg-[#0a0a0a] rounded-lg border border-[#1f1f1f]">
                {[
                  { key: 'enable_motion_brush', label: 'Runway Motion Brush', desc: 'Selective motion control' },
                  { key: 'enable_camera_path', label: 'Camera Path Control', desc: 'Custom camera trajectories' },
                  { key: 'enable_character_consistency', label: 'Character Consistency', desc: 'Same faces across scenes' },
                  { key: 'enable_lip_sync', label: 'Kling Lip-Sync', desc: 'Dialogue scenes' },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer group">
                    <div>
                      <div className="text-white text-xs font-medium">{label}</div>
                      <div className="text-gray-600 text-xs">{desc}</div>
                    </div>
                    <div
                      onClick={() => setForm({ ...form, [key]: !form[key] })}
                      className={`w-9 h-5 rounded-full transition-all relative cursor-pointer ${form[key] ? 'bg-amber-500' : 'bg-[#2a2a2a]'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form[key] ? 'left-4' : 'left-0.5'}`} />
                    </div>
                  </label>
                ))}
              </div>
            )}

            <button type="submit" disabled={generating || !form.project_id} className="studio-btn w-full flex items-center justify-center gap-2">
              {generating
                ? <><FiRefreshCw className="animate-spin" /> Starting Pipeline...</>
                : <><FiZap /> {activeTab === 'multi' ? `Generate with ${selectedProviders.length} Providers` : 'Generate Video'}</>}
            </button>
          </form>
        </div>

        {/* Provider Grid (multi-provider mode) */}
        {activeTab === 'multi' && providers.length > 0 && (
          <div className="lg:col-span-2 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Select Providers</h3>
                <span className="text-gray-500 text-xs">Chain order: {selectedProviders.join(' → ') || 'none'}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {providers.map(provider => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    selected={selectedProviders}
                    onToggle={toggleProvider}
                    recommended={selectedPreset && NARRATIVE_PRESETS.find(p => p.id === selectedPreset)?.recommended.includes(provider.id)}
                  />
                ))}
              </div>
            </div>

            {/* Video Queue */}
            {videos.length > 0 && (
              <div className="studio-card p-5">
                <h3 className="font-semibold text-white mb-3">Video Queue</h3>
                <div className="space-y-3">
                  {videos.map(v => {
                    const vProviders = v.generation_params?.provider_chain || []
                    return (
                      <div key={v.id} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="text-white font-medium">{v.title}</div>
                            {vProviders.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {vProviders.map(pid => (
                                  <span key={pid} className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: PROVIDER_COLORS[pid]?.bg, color: PROVIDER_COLORS[pid]?.color }}>
                                    {pid}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className={`status-badge status-${v.status}`}>{v.status}</span>
                        </div>
                        {v.status === 'processing' && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span className="truncate pr-4">{v.pipeline_stage}</span>
                              <span>{v.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-1000" style={{ width: `${v.progress}%` }} />
                            </div>
                          </div>
                        )}
                        {v.status === 'completed' && (
                          <div className="flex gap-2 mt-3">
                            <button className="studio-btn-outline text-xs px-3 py-1.5 flex items-center gap-1"><FiPlay size={12} /> Preview</button>
                            <button onClick={() => generateShorts(v.id)} className="studio-btn text-xs px-3 py-1.5 flex items-center gap-1"><FiZap size={12} /> Generate Shorts</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Single provider: video queue */}
        {activeTab === 'single' && (
          <div className="lg:col-span-2 studio-card p-6">
            <h3 className="font-semibold text-white mb-4">Video Queue</h3>
            {videos.length === 0 ? (
              <div className="text-center py-16 text-gray-600">
                <FiVideo size={40} className="mx-auto mb-3" />
                <p className="text-sm">No videos yet. Choose a provider and start generating.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {videos.map(v => (
                  <div key={v.id} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-white font-medium">{v.title}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{v.resolution} · {Math.round((v.duration||0)/60)} min</div>
                      </div>
                      <span className={`status-badge status-${v.status}`}>{v.status}</span>
                    </div>
                    {v.status === 'processing' && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{v.pipeline_stage}</span><span>{v.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all" style={{ width: `${v.progress}%` }} />
                        </div>
                      </div>
                    )}
                    {v.status === 'completed' && (
                      <div className="flex gap-2 mt-3">
                        <button className="studio-btn-outline text-xs px-3 py-1.5 flex items-center gap-1"><FiPlay size={12} /> Preview</button>
                        <button onClick={() => generateShorts(v.id)} className="studio-btn text-xs px-3 py-1.5 flex items-center gap-1"><FiZap size={12} /> Generate Shorts</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {shorts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
                <div className="text-gray-400 text-sm font-medium mb-2">Generated Shorts</div>
                <div className="grid grid-cols-2 gap-2">
                  {shorts.map(s => (
                    <div key={s.id} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white text-sm capitalize font-medium">{s.platform}</span>
                        <span className={`status-badge status-${s.status}`}>{s.status}</span>
                      </div>
                      <div className="text-gray-500 text-xs mt-1">{s.duration}s</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
