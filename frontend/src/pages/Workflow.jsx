import React, { useState, useEffect } from 'react'
import { FiArrowRight, FiZap, FiCheck, FiStar, FiTrendingUp, FiDollarSign } from 'react-icons/fi'
import api from '../utils/api'

const PROVIDER_COLORS = {
  veo3:   { bg: '#4285F415', border: '#4285F430', color: '#4285F4' },
  sora:   { bg: '#10a37f15', border: '#10a37f30', color: '#10a37f' },
  runway: { bg: '#6366f115', border: '#6366f130', color: '#6366f1' },
  kling:  { bg: '#f59e0b15', border: '#f59e0b30', color: '#f59e0b' },
  luma:   { bg: '#ec489915', border: '#ec489930', color: '#ec4899' },
}

const STEP_ICONS = {
  script: '✍',
  veo: '🎬',
  kling: '🎭',
  runway: '🎞',
  elevenlabs: '🎙',
  publish: '🚀',
}

export default function Workflow() {
  const [workflow, setWorkflow] = useState(null)
  const [providers, setProviders] = useState([])
  const [presets, setPresets] = useState([])
  const [activePreset, setActivePreset] = useState(null)

  useEffect(() => {
    api.get('/providers/workflow/recommended').then(r => setWorkflow(r.data)).catch(() => {})
    api.get('/providers/video').then(r => setProviders(r.data)).catch(() => {})
    api.get('/providers/narrative-presets').then(r => setPresets(r.data)).catch(() => {})
  }, [])

  const selectedPresetData = presets.find(p => p.id === activePreset)

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FiZap className="text-amber-500" /> Production Workflow
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Optimal provider chain for cinematic YouTube automation
        </p>
      </div>

      {/* Recommended workflow steps */}
      {workflow && (
        <div className="studio-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-bold text-lg">{workflow.name}</h2>
              <p className="text-gray-500 text-sm mt-1">{workflow.description}</p>
            </div>
            <div className="text-right">
              <div className="text-amber-500 font-bold text-lg">$10k–$50k</div>
              <div className="text-gray-500 text-xs">/month target</div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-stretch gap-2">
            {workflow.steps.map((step, i) => (
              <React.Fragment key={step.step}>
                <div className="flex-1 p-4 rounded-xl border border-[#2a2a2a] bg-[#111] hover:border-amber-500/30 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold flex items-center justify-center">
                      {step.step}
                    </div>
                    <span className="text-lg">{STEP_ICONS[step.icon] || '⚙'}</span>
                  </div>
                  <div className="text-white text-sm font-semibold">{step.provider}</div>
                  <div className="text-gray-400 text-xs mt-0.5 font-medium">{step.role}</div>
                  <div className="text-gray-600 text-xs mt-2 leading-relaxed">{step.output}</div>
                </div>
                {i < workflow.steps.length - 1 && (
                  <div className="flex items-center justify-center text-gray-700 flex-shrink-0">
                    <FiArrowRight size={16} className="rotate-90 md:rotate-0" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Narrative Presets */}
      <div>
        <h2 className="text-white font-bold text-lg mb-4">Narrative Presets</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map(preset => (
            <div
              key={preset.id}
              onClick={() => setActivePreset(activePreset === preset.id ? null : preset.id)}
              className={`studio-card p-5 cursor-pointer transition-all hover:border-amber-500/30 ${activePreset === preset.id ? 'border-amber-500/50' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">{preset.name}</h3>
                <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-medium">
                  {preset.avg_views} views
                </span>
              </div>
              <p className="text-gray-500 text-xs mb-3">{preset.description}</p>
              <div className="space-y-1 text-xs">
                <div className="flex gap-1 items-start">
                  <span className="text-gray-600">Genre:</span>
                  <span className="text-gray-300">{preset.genre}</span>
                </div>
                <div className="flex gap-1 items-start">
                  <span className="text-gray-600">Tone:</span>
                  <span className="text-gray-300">{preset.tone}</span>
                </div>
                <div className="flex gap-1 items-start">
                  <span className="text-gray-600">CPM:</span>
                  <span className="text-green-400">{preset.monetization}</span>
                </div>
              </div>
              <div className="mt-3 flex gap-1 flex-wrap">
                {preset.recommended_providers?.map(pid => (
                  <span key={pid} className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: PROVIDER_COLORS[pid]?.bg, color: PROVIDER_COLORS[pid]?.color, border: `1px solid ${PROVIDER_COLORS[pid]?.border}` }}>
                    {pid}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Expanded preset */}
        {selectedPresetData && (
          <div className="mt-4 studio-card p-5 border-amber-500/20">
            <h3 className="font-semibold text-amber-500 mb-3">{selectedPresetData.name} — Example Titles</h3>
            <div className="space-y-2">
              {selectedPresetData.example_titles.map((title, i) => (
                <div key={i} className="p-3 bg-[#111] border border-[#2a2a2a] rounded-lg flex items-center gap-3">
                  <span className="text-gray-600 text-xs w-4">{i+1}.</span>
                  <span className="text-white text-sm font-medium">{title}</span>
                  <FiTrendingUp className="text-green-400 ml-auto flex-shrink-0" size={14} />
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Shot style: <span className="text-gray-300">{selectedPresetData.shot_style}</span>
            </div>
          </div>
        )}
      </div>

      {/* Provider comparison */}
      <div>
        <h2 className="text-white font-bold text-lg mb-4">Provider Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-[#2a2a2a]">
                <th className="text-left pb-3 pr-4">Provider</th>
                <th className="text-left pb-3 pr-4">Grade</th>
                <th className="text-left pb-3 pr-4">Best For</th>
                <th className="text-left pb-3 pr-4">Max Duration</th>
                <th className="text-right pb-3">Cost/sec</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {providers.map(p => {
                const c = PROVIDER_COLORS[p.id] || {}
                return (
                  <tr key={p.id} className="hover:bg-white/2 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-white">{p.name}</div>
                      <div className="text-gray-500 text-xs italic mt-0.5">{p.tagline}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-bold" style={{ color: c.color }}>{p.grade_label}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {(p.best_for || []).slice(0, 2).map((b, i) => (
                          <span key={i} className="text-xs text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">{b}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-300">{p.max_duration}s</td>
                    <td className="py-3 text-right">
                      <span className="text-green-400 font-medium">${p.cost_per_second}/s</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
