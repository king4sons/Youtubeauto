import React, { useState, useEffect } from 'react'
import { FiFileText, FiZap, FiClock, FiRefreshCw } from 'react-icons/fi'
import api from '../utils/api'
import toast from 'react-hot-toast'

const GENRES = ['Thriller', 'Drama', 'Sci-Fi', 'Horror', 'Action', 'Documentary', 'Mystery', 'Fantasy']
const TONES = ['Dramatic', 'Suspenseful', 'Dark', 'Uplifting', 'Mysterious', 'Epic', 'Melancholic', 'Intense']

export default function ScriptGenerator() {
  const [projects, setProjects] = useState([])
  const [scripts, setScripts] = useState([])
  const [activeScript, setActiveScript] = useState(null)
  const [polling, setPolling] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({
    project_id: '',
    title: '',
    genre: 'Thriller',
    tone: 'Dramatic',
    duration_minutes: 12,
    premise: '',
    characters: '',
    setting: '',
    additional_notes: '',
  })

  useEffect(() => {
    api.get('/projects/').then(r => setProjects(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (form.project_id) {
      api.get(`/scripts/project/${form.project_id}`).then(r => setScripts(r.data)).catch(() => {})
    }
  }, [form.project_id])

  useEffect(() => {
    if (polling) {
      const interval = setInterval(async () => {
        try {
          const { data } = await api.get(`/scripts/${polling}`)
          setActiveScript(data)
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(interval)
            setPolling(null)
            setGenerating(false)
            if (data.status === 'completed') toast.success('Script generated!')
            else toast.error('Script generation failed')
          }
        } catch {}
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [polling])

  async function handleGenerate(e) {
    e.preventDefault()
    if (!form.project_id) return toast.error('Select a project first')
    setGenerating(true)
    try {
      const payload = {
        ...form,
        project_id: Number(form.project_id),
        characters: form.characters ? form.characters.split(',').map(s => s.trim()) : [],
      }
      const { data } = await api.post('/scripts/generate', payload)
      setActiveScript(data)
      setPolling(data.id)
      toast.success('Script generation started!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Generation failed')
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FiFileText className="text-amber-500" /> Script Generation Agent
        </h1>
        <p className="text-gray-500 text-sm mt-1">AI-powered cinematic storytelling engine</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="studio-card p-6">
          <h3 className="font-semibold text-white mb-5">Story Parameters</h3>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Project *</label>
              <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })} className="studio-select" required>
                <option value="">Select a project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Script Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="studio-input" placeholder="e.g. The Last Signal - Episode 1" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Genre</label>
                <select value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} className="studio-select">
                  {GENRES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Tone</label>
                <select value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })} className="studio-select">
                  {TONES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Duration (minutes)</label>
              <input type="range" min={10} max={20} value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} className="w-full accent-amber-500" />
              <div className="text-amber-500 text-sm font-medium mt-1">{form.duration_minutes} minutes</div>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Story Premise *</label>
              <textarea value={form.premise} onChange={e => setForm({ ...form, premise: e.target.value })} className="studio-input" rows={3} placeholder="A lone detective discovers a conspiracy..." required />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Characters (comma-separated)</label>
              <input value={form.characters} onChange={e => setForm({ ...form, characters: e.target.value })} className="studio-input" placeholder="Detective Morgan, The Informant, Dr. Reed" />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Setting</label>
              <input value={form.setting} onChange={e => setForm({ ...form, setting: e.target.value })} className="studio-input" placeholder="Near-future city, underground labs" />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Additional Notes</label>
              <textarea value={form.additional_notes} onChange={e => setForm({ ...form, additional_notes: e.target.value })} className="studio-input" rows={2} placeholder="Twist at the end, flashback structure..." />
            </div>
            <button type="submit" disabled={generating} className="studio-btn w-full flex items-center justify-center gap-2">
              {generating ? <><FiRefreshCw className="animate-spin" /> Generating Script...</> : <><FiZap /> Generate Script</>}
            </button>
          </form>
        </div>

        {/* Script Output */}
        <div className="studio-card p-6 flex flex-col">
          <h3 className="font-semibold text-white mb-4">Generated Script</h3>
          {!activeScript ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-600">
                <FiFileText size={48} className="mx-auto mb-3" />
                <p>Your script will appear here</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-medium">{activeScript.title}</span>
                  {activeScript.word_count && <span className="text-gray-500 text-xs ml-2">{activeScript.word_count} words</span>}
                </div>
                <span className={`status-badge status-${activeScript.status}`}>{activeScript.status}</span>
              </div>
              {(activeScript.status === 'queued' || activeScript.status === 'generating') && (
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <FiRefreshCw className="text-amber-500 animate-spin" />
                  <span className="text-amber-400 text-sm">AI is crafting your cinematic story...</span>
                </div>
              )}
              {activeScript.content && (
                <div className="flex-1 bg-[#0a0a0a] rounded-lg p-4 overflow-y-auto border border-[#2a2a2a]">
                  <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">{activeScript.content.split('SCENES_JSON:')[0]}</pre>
                </div>
              )}
              {activeScript.scenes?.length > 0 && (
                <div>
                  <div className="text-gray-400 text-xs font-semibold mb-2">SCENES ({activeScript.scenes.length})</div>
                  <div className="grid grid-cols-2 gap-2">
                    {activeScript.scenes.map(s => (
                      <div key={s.scene} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
                        <div className="text-amber-500 text-xs font-semibold">Scene {s.scene}</div>
                        <div className="text-white text-xs font-medium mt-0.5">{s.title}</div>
                        <div className="text-gray-500 text-xs mt-1">{s.location}</div>
                        <div className="text-gray-400 text-xs mt-1 flex items-center gap-1"><FiClock size={10} /> {s.duration}s</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
