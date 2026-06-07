import React, { useState, useEffect } from 'react'
import { FiEdit3, FiPlay, FiPause, FiScissors, FiVolume2, FiImage, FiSave, FiType } from 'react-icons/fi'
import api from '../utils/api'
import toast from 'react-hot-toast'

const TRACKS = [
  { label: 'Video', color: '#3b82f6', segments: [{ start: 0, end: 40, label: 'Opening' }, { start: 42, end: 70, label: 'Act 1' }, { start: 72, end: 100, label: 'Climax' }] },
  { label: 'Voiceover', color: '#8b5cf6', segments: [{ start: 0, end: 100, label: 'Narration Track' }] },
  { label: 'Music', color: '#f59e0b', segments: [{ start: 0, end: 50, label: 'Intro Theme' }, { start: 55, end: 100, label: 'Climax Score' }] },
  { label: 'SFX', color: '#22c55e', segments: [{ start: 3, end: 12, label: 'Ambient' }, { start: 65, end: 75, label: 'Impact' }, { start: 90, end: 100, label: 'Outro' }] },
]

export default function VideoEditor() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [videos, setVideos] = useState([])
  const [activeVideo, setActiveVideo] = useState(null)
  const [playhead, setPlayhead] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get('/projects/').then(r => setProjects(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    api.get(`/videos/project/${selectedProject}`)
      .then(r => {
        const done = r.data.filter(v => v.status === 'completed')
        setVideos(done)
        if (done.length && !activeVideo) setActiveVideo(done[0])
      })
      .catch(() => {})
  }, [selectedProject])

  useEffect(() => {
    if (!playing) return
    const interval = setInterval(() => {
      setPlayhead(p => {
        if (p >= 100) { setPlaying(false); return 0 }
        return p + 0.2
      })
    }, 50)
    return () => clearInterval(interval)
  }, [playing])

  function handleSave() {
    setSaved(true)
    toast.success('Edit saved!')
    setTimeout(() => setSaved(false), 2000)
  }

  const duration = activeVideo?.duration || 600
  const currentTime = Math.floor(playhead * duration / 100)
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiEdit3 className="text-amber-500" /> Video Editor
          </h1>
          <p className="text-gray-500 text-sm mt-1">Timeline-based cinematic editing</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="studio-select w-52">
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {videos.length > 1 && (
            <select value={activeVideo?.id || ''} onChange={e => setActiveVideo(videos.find(v => v.id === Number(e.target.value)))} className="studio-select w-48">
              {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
            </select>
          )}
          <button onClick={handleSave} className="studio-btn flex items-center gap-2">
            <FiSave size={15} /> {saved ? 'Saved!' : 'Save Edit'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Preview */}
        <div className="lg:col-span-2 studio-card overflow-hidden">
          <div className="aspect-video bg-black flex items-center justify-center relative">
            {activeVideo ? (
              <>
                <div className="text-center">
                  <div className="text-5xl mb-3">{playing ? '▶' : '⏸'}</div>
                  <div className="text-white font-medium">{activeVideo.title}</div>
                  <div className="text-gray-500 text-sm">{activeVideo.resolution} · Preview</div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <input
                    type="range" min={0} max={100} step={0.1}
                    value={playhead}
                    onChange={e => setPlayhead(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPlaying(!playing)}
                        className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-black"
                      >
                        {playing ? <FiPause size={14} /> : <FiPlay size={14} />}
                      </button>
                    </div>
                    <div className="text-gray-300 text-sm font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-gray-600 text-center p-8">
                <FiEdit3 size={40} className="mx-auto mb-3" />
                <p>Select a project with completed videos</p>
              </div>
            )}
          </div>
        </div>

        {/* Tools */}
        <div className="studio-card p-4 space-y-2">
          <h4 className="text-white font-medium text-sm mb-3">Edit Tools</h4>
          {[
            { icon: FiScissors, label: 'Trim & Cut', desc: 'Clip scene segments', active: false },
            { icon: FiVolume2, label: 'Audio Mix', desc: 'Balance track levels', active: false },
            { icon: FiImage, label: 'Thumbnail', desc: 'Set custom thumbnail', active: false },
            { icon: FiType, label: 'Captions', desc: 'Auto-generated subtitles', active: false },
          ].map(({ icon: Icon, label, desc }) => (
            <button key={label} className="w-full flex items-center gap-3 p-3 bg-[#111] border border-[#2a2a2a] rounded-lg hover:border-amber-500/30 transition-all text-left group">
              <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                <Icon className="text-amber-500" size={16} />
              </div>
              <div>
                <div className="text-white text-sm font-medium">{label}</div>
                <div className="text-gray-500 text-xs">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="studio-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium text-sm">Timeline</h4>
          <div className="text-gray-500 text-xs">{formatTime(currentTime)} / {formatTime(duration)}</div>
        </div>
        <div className="space-y-2">
          {TRACKS.map(track => (
            <div key={track.label} className="flex items-center gap-3">
              <div className="w-20 text-gray-400 text-xs font-medium flex-shrink-0 text-right pr-2">{track.label}</div>
              <div className="flex-1 h-9 bg-[#0a0a0a] border border-[#2a2a2a] rounded relative overflow-hidden">
                {track.segments.map((seg, i) => (
                  <div
                    key={i}
                    className="absolute top-1 bottom-1 rounded flex items-center px-2 cursor-pointer hover:brightness-125 transition-all select-none"
                    style={{
                      left: `${seg.start}%`,
                      width: `${seg.end - seg.start}%`,
                      background: `${track.color}22`,
                      borderLeft: `2px solid ${track.color}`,
                    }}
                  >
                    <span className="text-xs truncate" style={{ color: track.color }}>{seg.label}</span>
                  </div>
                ))}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 pointer-events-none"
                  style={{ left: `${playhead}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-gray-600 text-xs mt-2" style={{ paddingLeft: '92px' }}>
          {[0, 5, 10, 15, 20].map(m => <span key={m}>{m}:00</span>)}
        </div>
      </div>
    </div>
  )
}
