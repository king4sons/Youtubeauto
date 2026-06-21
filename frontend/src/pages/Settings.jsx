import React, { useState, useEffect } from 'react'
import { FiKey, FiCheck, FiX, FiExternalLink, FiRefreshCw, FiCopy, FiZap } from 'react-icons/fi'
import api from '../utils/api'
import toast from 'react-hot-toast'

const GROUPS = [
  {
    label: 'AI Script Generation',
    keys: ['anthropic'],
    color: '#f59e0b',
    priority: true,
  },
  {
    label: 'AI Voiceover',
    keys: ['elevenlabs'],
    color: '#8b5cf6',
  },
  {
    label: 'Video Generators',
    keys: ['veo', 'openai', 'runway', 'kling', 'luma'],
    color: '#3b82f6',
  },
  {
    label: 'Social Publishing',
    keys: ['youtube', 'tiktok', 'instagram', 'facebook'],
    color: '#22c55e',
  },
]

function StatusBadge({ configured }) {
  return configured ? (
    <span className="flex items-center gap-1.5 text-green-400 text-xs font-semibold">
      <FiCheck size={12} /> Connected
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-gray-600 text-xs font-semibold">
      <FiX size={12} /> Not set
    </span>
  )
}

export default function Settings() {
  const [apiStatus, setApiStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState({})
  const [testResults, setTestResults] = useState({})
  const [template, setTemplate] = useState('')
  const [showTemplate, setShowTemplate] = useState(false)

  useEffect(() => {
    fetchStatus()
    api.get('/settings/env-template').then(r => setTemplate(r.data.template)).catch(() => {})
  }, [])

  async function fetchStatus() {
    setLoading(true)
    try {
      const { data } = await api.get('/settings/api-status')
      setApiStatus(data)
    } catch { toast.error('Failed to load API status') }
    finally { setLoading(false) }
  }

  async function testKey(service) {
    setTesting(t => ({ ...t, [service]: true }))
    setTestResults(r => ({ ...r, [service]: null }))
    try {
      const { data } = await api.post(`/settings/test/${service}`)
      setTestResults(r => ({ ...r, [service]: { ok: true, message: data.message, detail: data.response || data.character_count } }))
      toast.success(`${service} connected!`)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Connection failed'
      setTestResults(r => ({ ...r, [service]: { ok: false, message: msg } }))
      toast.error(msg)
    } finally {
      setTesting(t => ({ ...t, [service]: false }))
    }
  }

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(template)
      toast.success('Copied to clipboard!')
    } catch { toast.error('Copy failed') }
  }

  const configuredCount = apiStatus ? Object.values(apiStatus).filter(v => v.configured).length : 0
  const totalCount = apiStatus ? Object.keys(apiStatus).length : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FiKey className="text-amber-500" /> API Settings
          </h1>
          <p className="text-gray-500 text-sm mt-1">Connect your AI providers and social platforms</p>
        </div>
        <button onClick={fetchStatus} disabled={loading} className="studio-btn-outline flex items-center gap-2 text-sm">
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Status bar */}
      <div className="studio-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white font-semibold">Connection Status</div>
          <div className="text-amber-500 font-bold">{configuredCount}/{totalCount} connected</div>
        </div>
        <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-700"
            style={{ width: totalCount ? `${(configuredCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
        <div className="mt-3 text-gray-500 text-xs">
          {configuredCount === 0
            ? 'No API keys set. Add ANTHROPIC_API_KEY first to enable script generation.'
            : configuredCount === totalCount
            ? 'All services connected. Full automation enabled.'
            : `${totalCount - configuredCount} service${totalCount - configuredCount > 1 ? 's' : ''} not configured — add keys to .env to unlock.`}
        </div>
      </div>

      {/* Priority callout */}
      {apiStatus && !apiStatus.anthropic?.configured && (
        <div className="p-4 border border-amber-500/30 bg-amber-500/5 rounded-xl flex items-start gap-3">
          <FiZap className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <div className="text-amber-400 font-semibold text-sm">Start here: Anthropic API Key</div>
            <div className="text-gray-400 text-xs mt-1">
              Add <code className="bg-black/30 px-1 py-0.5 rounded text-amber-300">ANTHROPIC_API_KEY=sk-ant-...</code> to your <code className="bg-black/30 px-1 py-0.5 rounded">backend/.env</code> file to enable real Claude script generation. Get your key at{' '}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-amber-500 underline">console.anthropic.com</a>.
            </div>
          </div>
        </div>
      )}

      {/* API key groups */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-32 shimmer rounded-xl" />)}</div>
      ) : apiStatus && (
        <div className="space-y-5">
          {GROUPS.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: group.color }} />
                <h3 className="text-white font-semibold text-sm">{group.label}</h3>
              </div>
              <div className="space-y-2">
                {group.keys.map(key => {
                  const info = apiStatus[key]
                  if (!info) return null
                  const testable = key === 'anthropic' || key === 'elevenlabs'
                  const result = testResults[key]
                  return (
                    <div key={key} className="studio-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <StatusBadge configured={info.configured} />
                            <span className="text-white text-sm font-medium">{info.label}</span>
                            {group.priority && <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-semibold">Priority</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <code className="text-gray-600 text-xs">{info.env_var}</code>
                            {info.masked_key && (
                              <code className="text-green-400 text-xs">{info.masked_key}</code>
                            )}
                          </div>
                          {result && (
                            <div className={`mt-2 text-xs px-2 py-1 rounded ${result.ok ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                              {result.message}
                              {result.detail && <span className="ml-2 opacity-70">{result.detail}</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                          <a
                            href={info.get_key_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 text-gray-500 hover:text-amber-400 transition-colors"
                            title="Get API key"
                          >
                            <FiExternalLink size={15} />
                          </a>
                          {testable && (
                            <button
                              onClick={() => testKey(key)}
                              disabled={!info.configured || testing[key]}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                                info.configured
                                  ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
                                  : 'border-[#2a2a2a] text-gray-600 cursor-not-allowed'
                              }`}
                            >
                              {testing[key] ? <FiRefreshCw size={12} className="animate-spin" /> : 'Test'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* .env template */}
      <div className="studio-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white font-semibold">backend/.env Template</h3>
            <p className="text-gray-500 text-xs mt-0.5">Copy this, fill in your keys, save as <code className="text-amber-400">backend/.env</code>, restart the server</p>
          </div>
          <div className="flex gap-2">
            <button onClick={copyTemplate} className="studio-btn-outline flex items-center gap-1.5 text-xs px-3 py-1.5">
              <FiCopy size={12} /> Copy
            </button>
            <button onClick={() => setShowTemplate(!showTemplate)} className="studio-btn-outline text-xs px-3 py-1.5">
              {showTemplate ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {showTemplate && (
          <pre className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
            {template}
          </pre>
        )}
        {!showTemplate && (
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 text-center text-gray-600 text-sm">
            Click "Show" to reveal the .env template
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="studio-card p-5">
        <h3 className="text-white font-semibold mb-3">How API Keys Work</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex items-start gap-2"><span className="text-amber-500 font-bold flex-shrink-0">1.</span> Copy the template above into a file named <code className="text-amber-300 bg-black/30 px-1 rounded">backend/.env</code></div>
          <div className="flex items-start gap-2"><span className="text-amber-500 font-bold flex-shrink-0">2.</span> Replace placeholder values with your real API keys from each provider's dashboard</div>
          <div className="flex items-start gap-2"><span className="text-amber-500 font-bold flex-shrink-0">3.</span> Restart the backend server: <code className="text-amber-300 bg-black/30 px-1 rounded">uvicorn main:app --port 8000 --reload</code></div>
          <div className="flex items-start gap-2"><span className="text-amber-500 font-bold flex-shrink-0">4.</span> Click "Refresh" above — connected services will show green</div>
          <div className="flex items-start gap-2"><span className="text-amber-500 font-bold flex-shrink-0">5.</span> Use "Test" to verify Anthropic and ElevenLabs are working</div>
        </div>
        <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg text-xs text-gray-400">
          <span className="text-amber-400 font-semibold">Demo mode:</span> All features work without any API keys using sample data. Add keys to unlock real AI generation.
        </div>
      </div>
    </div>
  )
}
