import React, { useState, useEffect } from 'react'
import { FiFilm, FiZap, FiCamera, FiRefreshCw } from 'react-icons/fi'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function StoryboardPage() {
  const [projects, setProjects] = useState([])
  const [scripts, setScripts] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedScript, setSelectedScript] = useState('')
  const [storyboard, setStoryboard] = useState(null)
  const [polling, setPolling] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => { api.get('/projects/').then(r => setProjects(r.data)).catch(() => {}) }, [])
  useEffect(() => {
    if (selectedProject) {
      api.get(`/scripts/project/${selectedProject}`).then(r => setScripts(r.data.filter(s => s.status === 'completed'))).catch(() => {})
      api.get(`/storyboard/project/${selectedProject}`).then(r => { if (r.data.length) setStoryboard(r.data[r.data.length - 1]) }).catch(() => {})
    }
  }, [selectedProject])

  useEffect(() => {
    if (polling) {
      const interval = setInterval(async () => {
        const { data } = await api.get(`/storyboard/${polling}`)
        setStoryboard(data)
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval)
          setPolling(null)
          setGenerating(false)
          if (data.status === 'completed') toast.success('Storyboard ready!')
        }
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [polling])

  async function handleGenerate() {
    if (!selectedProject || !selectedScript) return toast.error('Select project and script')
    setGenerating(true)
    try {
      const { data } = await api.post('/storyboard/generate', { project_id: Number(selectedProject), script_id: Number(selectedScript) })
      setStoryboard(data)
      setPolling(data.id)
      toast.success('Generating storyboard...')
    } catch { toast.error('Failed'); setGenerating(false) }
  }

  const frames = storyboard?.frames || []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FiFilm className="text-amber-500" /> Storyboard Agent
        </h1>
        <p className="text-gray-500 text-sm mt-1">Visual scene planning from your script</p>
      </div>

      <div className="studio-card p-5 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-48">
          <label className="text-gray-400 text-sm block mb-1">Project</label>
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="studio-select">
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="text-gray-400 text-sm block mb-1">Script</label>
          <select value={selectedScript} onChange={e => setSelectedScript(e.target.value)} className="studio-select">
            <option value="">Select script</option>
            {scripts.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
        <button onClick={handleGenerate} disabled={generating} className="studio-btn flex items-center gap-2">
          {generating ? <><FiRefreshCw className="animate-spin" /> Generating...</> : <><FiZap /> Generate Storyboard</>}
        </button>
      </div>

      {storyboard && (storyboard.status === 'queued' || storyboard.status === 'generating') && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <FiRefreshCw className="text-amber-500 animate-spin" />
          <span className="text-amber-400">Analyzing script and building visual frames...</span>
        </div>
      )}

      {frames.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {frames.map(frame => (
            <div key={frame.id} className="studio-card overflow-hidden hover:border-amber-500/30 transition-all group">
              <div className="h-36 flex items-center justify-center relative" style={{ background: frame.placeholder_color || '#1a1a1a' }}>
                <FiCamera className="text-white/30 text-3xl" />
                <div className="absolute top-2 left-2 bg-black/60 text-amber-400 text-xs px-2 py-0.5 rounded font-mono">
                  S{frame.scene_number}·F{frame.frame_number}
                </div>
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                  {frame.duration}s
                </div>
              </div>
              <div className="p-3">
                <div className="text-white text-sm font-medium truncate">{frame.title}</div>
                <div className="text-gray-500 text-xs mt-0.5">{frame.camera_angle}</div>
                <div className="text-gray-600 text-xs mt-1 truncate">{frame.location}</div>
                <div className="mt-2 flex gap-1 flex-wrap">
                  <span className="text-xs bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">{frame.mood}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!storyboard && !generating && (
        <div className="text-center py-20 studio-card">
          <FiFilm className="text-gray-600 text-5xl mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">No storyboard yet</h3>
          <p className="text-gray-500 text-sm">Select a project with a completed script and generate your storyboard</p>
        </div>
      )}
    </div>
  )
}
