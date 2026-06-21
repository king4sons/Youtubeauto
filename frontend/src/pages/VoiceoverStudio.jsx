import React, { useState, useEffect } from 'react'
import { FiMic, FiPlay, FiZap, FiRefreshCw } from 'react-icons/fi'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function VoiceoverStudio() {
  const [voices, setVoices] = useState([])
  const [projects, setProjects] = useState([])
  const [scripts, setScripts] = useState([])
  const [voiceovers, setVoiceovers] = useState([])
  const [selectedVoice, setSelectedVoice] = useState('male_deep')
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedScript, setSelectedScript] = useState('')
  const [generating, setGenerating] = useState(false)
  const [voiceProvider, setVoiceProvider] = useState('elevenlabs')

  useEffect(() => {
    api.get('/voiceover/voices').then(r => setVoices(r.data)).catch(() => {})
    api.get('/projects/').then(r => setProjects(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    api.get(`/scripts/project/${selectedProject}`)
      .then(r => setScripts(r.data.filter(s => s.status === 'completed')))
      .catch(() => {})
    api.get(`/voiceover/project/${selectedProject}`)
      .then(r => setVoiceovers(r.data))
      .catch(() => {})
  }, [selectedProject])

  async function handleGenerate() {
    if (!selectedProject || !selectedScript) return toast.error('Select project and script')
    setGenerating(true)
    try {
      const { data } = await api.post('/voiceover/generate', {
        project_id: Number(selectedProject),
        script_id: Number(selectedScript),
        voice_id: selectedVoice,
      })
      setVoiceovers(prev => [data, ...prev])
      toast.success('Voiceover generating...')

      const poll = setInterval(async () => {
        const res = await api.get(`/voiceover/project/${selectedProject}`)
        setVoiceovers(res.data)
        const updated = res.data.find(v => v.id === data.id)
        if (updated && (updated.status === 'completed' || updated.status === 'failed')) {
          clearInterval(poll)
          if (updated.status === 'completed') toast.success('Voiceover ready!')
        }
      }, 2000)
    } catch { toast.error('Generation failed') }
    finally { setGenerating(false) }
  }

  const filteredVoices = voices.filter(v => voiceProvider === 'all' || v.provider === voiceProvider)

  const PROVIDER_TABS = [
    { id: 'elevenlabs', label: 'ElevenLabs' },
    { id: 'studio', label: 'Studio Voices' },
    { id: 'all', label: 'All' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FiMic className="text-amber-500" /> Voiceover Studio
        </h1>
        <p className="text-gray-500 text-sm mt-1">AI voice narration for your cinematic stories</p>
      </div>

      {/* Provider Tabs */}
      <div className="flex gap-1 p-1 bg-[#0a0a0a] rounded-lg w-fit border border-[#1f1f1f]">
        {PROVIDER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setVoiceProvider(tab.id)}
            className={`py-1.5 px-4 rounded text-xs font-semibold transition-all ${
              voiceProvider === tab.id
                ? 'bg-amber-500 text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="studio-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Select Voice</h3>
            <span className="text-gray-500 text-xs">{filteredVoices.length} voices</span>
          </div>
          <div className="space-y-2">
            {filteredVoices.length === 0 ? (
              <div className="text-center py-10 text-gray-600 text-sm border border-dashed border-[#2a2a2a] rounded-xl">
                No voices available for this provider
              </div>
            ) : (
              filteredVoices.map(voice => (
                <div
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedVoice === voice.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-white/3'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-white font-medium">{voice.name}</div>
                        {voice.provider === 'elevenlabs' && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            ElevenLabs
                          </span>
                        )}
                        {voice.provider && voice.provider !== 'elevenlabs' && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-white/5 text-gray-400 border border-white/10">
                            {voice.provider}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-500 text-xs mt-0.5">{voice.style}</div>
                      <div className="text-gray-600 text-xs mt-1 italic">"{voice.preview_text}"</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded capitalize">{voice.gender}</span>
                      <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <FiPlay className="text-amber-500" size={12} />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="studio-card p-6 space-y-4">
          <h3 className="font-semibold text-white">Generate Voiceover</h3>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Project</label>
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="studio-select">
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Script</label>
            <select value={selectedScript} onChange={e => setSelectedScript(e.target.value)} className="studio-select">
              <option value="">Select script</option>
              {scripts.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          {selectedVoice && (
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <div className="text-sm text-amber-400">
                Selected: <span className="font-medium">{voices.find(v => v.id === selectedVoice)?.name}</span>
              </div>
              {voices.find(v => v.id === selectedVoice)?.provider === 'elevenlabs' && (
                <div className="text-xs text-amber-500/60 mt-0.5">Powered by ElevenLabs</div>
              )}
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedProject || !selectedScript}
            className="studio-btn w-full flex items-center justify-center gap-2"
          >
            {generating
              ? <><FiRefreshCw className="animate-spin" /> Generating...</>
              : <><FiMic /> Generate Voiceover</>}
          </button>

          <div className="pt-2">
            <h4 className="text-gray-400 text-sm font-medium mb-3">Generated Voiceovers</h4>
            {voiceovers.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm border border-dashed border-[#2a2a2a] rounded-xl">
                No voiceovers yet
              </div>
            ) : (
              <div className="space-y-2">
                {voiceovers.map(vo => (
                  <div key={vo.id} className="flex items-center justify-between p-3 bg-[#111] border border-[#2a2a2a] rounded-lg">
                    <div>
                      <div className="text-white text-sm font-medium">{vo.voice_name}</div>
                      <div className="text-gray-500 text-xs">
                        {vo.duration ? `${Math.round(vo.duration)}s` : 'Processing...'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`status-badge status-${vo.status}`}>{vo.status}</span>
                      {vo.status === 'completed' && (
                        <div className="w-7 h-7 bg-amber-500/20 rounded-full flex items-center justify-center cursor-pointer">
                          <FiPlay className="text-amber-500" size={12} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
