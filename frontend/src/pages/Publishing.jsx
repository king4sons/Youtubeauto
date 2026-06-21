import React, { useState, useEffect } from 'react'
import { FiSend, FiYoutube, FiInstagram, FiZap, FiCalendar, FiTag, FiCheck } from 'react-icons/fi'
import api from '../utils/api'
import toast from 'react-hot-toast'

const PLATFORMS = {
  youtube: { label: 'YouTube', color: '#ff0000', bg: '#ff000015' },
  tiktok: { label: 'TikTok', color: '#69C9D0', bg: '#69C9D015' },
  instagram: { label: 'Instagram', color: '#E1306C', bg: '#E1306C15' },
  facebook: { label: 'Facebook', color: '#1877F2', bg: '#1877F215' },
}

export default function Publishing() {
  const [projects, setProjects] = useState([])
  const [published, setPublished] = useState([])
  const [metadata, setMetadata] = useState(null)
  const [selectedProject, setSelectedProject] = useState('')
  const [form, setForm] = useState({ platform: 'youtube', content_type: 'video', title: '', description: '', tags: '', scheduled_at: '' })
  const [scheduling, setScheduling] = useState(false)
  const [generatingMeta, setGeneratingMeta] = useState(false)

  useEffect(() => {
    api.get('/projects/').then(r => setProjects(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedProject) {
      api.get(`/publishing/project/${selectedProject}`).then(r => setPublished(r.data)).catch(() => {})
    }
  }, [selectedProject])

  async function generateMetadata() {
    if (!selectedProject) return toast.error('Select a project first')
    setGeneratingMeta(true)
    try {
      const { data } = await api.post('/publishing/generate-metadata', { project_id: Number(selectedProject) })
      setMetadata(data)
      setForm(f => ({ ...f, title: data.titles[0], description: data.descriptions[0], tags: data.tags.join(', ') }))
      toast.success('AI metadata generated!')
    } catch { toast.error('Failed to generate metadata') }
    finally { setGeneratingMeta(false) }
  }

  async function handleSchedule(e) {
    e.preventDefault()
    if (!selectedProject) return toast.error('Select a project')
    setScheduling(true)
    try {
      const payload = {
        project_id: Number(selectedProject),
        platform: form.platform,
        content_type: form.content_type,
        title: form.title,
        description: form.description,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : undefined,
      }
      await api.post('/publishing/schedule', payload)
      toast.success(`Scheduled to ${form.platform}!`)
      api.get(`/publishing/project/${selectedProject}`).then(r => setPublished(r.data)).catch(() => {})
    } catch { toast.error('Scheduling failed') }
    finally { setScheduling(false) }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FiSend className="text-amber-500" /> Publishing System
        </h1>
        <p className="text-gray-500 text-sm mt-1">Schedule and publish to YouTube, TikTok, Instagram & Facebook</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="studio-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Publish Content</h3>
            <button onClick={generateMetadata} disabled={generatingMeta} className="studio-btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5">
              <FiZap size={12} /> {generatingMeta ? 'Generating...' : 'AI Metadata'}
            </button>
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-1">Project</label>
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="studio-select">
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-sm block mb-2">Platform</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(PLATFORMS).map(([id, { label, color, bg }]) => (
                <button
                  key={id} type="button"
                  onClick={() => setForm({ ...form, platform: id })}
                  className="p-3 rounded-xl border transition-all text-center"
                  style={form.platform === id
                    ? { borderColor: color, background: bg }
                    : { borderColor: '#2a2a2a' }}
                >
                  <div className="text-lg mb-1">
                    {id === 'youtube' ? '▶' : id === 'tiktok' ? '♪' : id === 'instagram' ? '◈' : '⬟'}
                  </div>
                  <div className="text-xs" style={{ color: form.platform === id ? color : '#9ca3af' }}>{label}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSchedule} className="space-y-4">
            <div className="flex gap-2">
              {['video', 'short'].map(t => (
                <button key={t} type="button" onClick={() => setForm({ ...form, content_type: t })}
                  className={`flex-1 py-2 rounded-lg border text-sm transition-all capitalize ${
                    form.content_type === t
                      ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                      : 'border-[#2a2a2a] text-gray-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div>
              <label className="text-gray-400 text-sm block mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="studio-input" placeholder="Video title" required />
            </div>

            {metadata?.titles && (
              <div className="space-y-1">
                <div className="text-gray-500 text-xs">AI Suggested Titles:</div>
                {metadata.titles.slice(1).map((t, i) => (
                  <div key={i} onClick={() => setForm({ ...form, title: t })}
                    className="text-xs p-2 bg-[#111] border border-[#2a2a2a] rounded cursor-pointer hover:border-amber-500/30 text-gray-300 transition-all">
                    {t}
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="text-gray-400 text-sm block mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="studio-input" rows={4} placeholder="Video description with hashtags..." />
            </div>

            <div>
              <label className="text-gray-400 text-sm block mb-1 flex items-center gap-1"><FiTag size={12} /> Tags</label>
              <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="studio-input" placeholder="thriller, cinema, story" />
            </div>

            <div>
              <label className="text-gray-400 text-sm block mb-1 flex items-center gap-1"><FiCalendar size={12} /> Schedule At (leave blank for immediate)</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} className="studio-input" />
            </div>

            <button type="submit" disabled={scheduling} className="studio-btn w-full flex items-center justify-center gap-2">
              {scheduling ? 'Scheduling...' : <><FiSend size={15} /> {form.scheduled_at ? 'Schedule Upload' : 'Publish Now'}</>}
            </button>
          </form>
        </div>

        <div className="studio-card p-6">
          <h3 className="font-semibold text-white mb-4">Published & Scheduled</h3>
          {published.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <FiSend size={40} className="mx-auto mb-3" />
              <p className="text-sm">No published content for this project</p>
            </div>
          ) : (
            <div className="space-y-3">
              {published.map(item => {
                const plat = PLATFORMS[item.platform] || { color: '#888', bg: '#88888815', label: item.platform }
                return (
                  <div key={item.id} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg" style={{ background: plat.bg }}>
                        {item.platform === 'youtube' ? '▶' : item.platform === 'tiktok' ? '♪' : item.platform === 'instagram' ? '◈' : '⬟'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{item.title}</div>
                        <div className="text-gray-500 text-xs mt-0.5 capitalize">{item.platform} · {item.content_type}</div>
                        {item.scheduled_at && (
                          <div className="text-gray-600 text-xs mt-1 flex items-center gap-1">
                            <FiCalendar size={10} /> {new Date(item.scheduled_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <span className={`status-badge status-${item.status} flex-shrink-0`}>{item.status}</span>
                    </div>
                    {item.status === 'published' && (
                      <div className="mt-3 flex gap-4 text-xs text-gray-500">
                        <span>👁 {item.views}</span>
                        <span>👍 {item.likes}</span>
                        <span>💬 {item.comments}</span>
                        <span>↗ {item.shares}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
