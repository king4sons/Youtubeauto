import React, { useEffect, useState } from 'react'
import { FiPlus, FiFolder, FiTrash2, FiEdit2, FiClock, FiZap } from 'react-icons/fi'
import api from '../utils/api'
import toast from 'react-hot-toast'

const GENRES = ['Thriller', 'Drama', 'Sci-Fi', 'Horror', 'Action', 'Documentary', 'Romance', 'Mystery', 'Fantasy', 'Comedy']

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', genre: '', duration_target: 600 })
  const [creating, setCreating] = useState(false)

  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    try {
      const { data } = await api.get('/projects/')
      setProjects(data)
    } catch { toast.error('Failed to load projects') }
    finally { setLoading(false) }
  }

  async function createProject(e) {
    e.preventDefault()
    setCreating(true)
    try {
      const { data } = await api.post('/projects/', form)
      setProjects([data, ...projects])
      setShowModal(false)
      setForm({ title: '', description: '', genre: '', duration_target: 600 })
      toast.success('Project created!')
    } catch { toast.error('Failed to create project') }
    finally { setCreating(false) }
  }

  async function deleteProject(id) {
    if (!confirm('Delete this project?')) return
    try {
      await api.delete(`/projects/${id}`)
      setProjects(projects.filter(p => p.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your cinematic productions</p>
        </div>
        <button onClick={() => setShowModal(true)} className="studio-btn flex items-center gap-2">
          <FiPlus size={16} /> New Project
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 shimmer rounded-xl" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24 studio-card">
          <FiFolder className="text-gray-600 text-5xl mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">No projects yet</h3>
          <p className="text-gray-500 text-sm mb-6">Create your first cinematic production</p>
          <button onClick={() => setShowModal(true)} className="studio-btn">Create Project</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <div key={p.id} className="studio-card p-5 hover:border-amber-500/30 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <FiFolder className="text-amber-500" size={20} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/10">
                    <FiEdit2 size={14} />
                  </button>
                  <button onClick={() => deleteProject(p.id)} className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-400/10">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-white mb-1">{p.title}</h3>
              <p className="text-gray-500 text-sm line-clamp-2 mb-3">{p.description || 'No description'}</p>
              <div className="flex items-center justify-between">
                <span className={`status-badge status-${p.status}`}>{p.status}</span>
                <div className="flex items-center gap-1 text-gray-500 text-xs">
                  <FiClock size={12} />
                  {Math.round(p.duration_target / 60)} min
                </div>
              </div>
              {p.genre && (
                <div className="mt-2">
                  <span className="text-xs bg-white/5 text-gray-400 px-2 py-1 rounded">{p.genre}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-5">New Project</h2>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Project Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="studio-input" placeholder="e.g. The Last Signal" required />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="studio-input" rows={3} placeholder="Brief premise of your story..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Genre</label>
                  <select value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} className="studio-select">
                    <option value="">Select genre</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Duration</label>
                  <select value={form.duration_target} onChange={e => setForm({ ...form, duration_target: Number(e.target.value) })} className="studio-select">
                    <option value={600}>10 minutes</option>
                    <option value={720}>12 minutes</option>
                    <option value={900}>15 minutes</option>
                    <option value={1200}>20 minutes</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="studio-btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={creating} className="studio-btn flex-1">{creating ? 'Creating...' : 'Create Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
