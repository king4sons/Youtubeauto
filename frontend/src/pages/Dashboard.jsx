import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiFolder, FiVideo, FiMic, FiBarChart2, FiPlus, FiTrendingUp, FiEye, FiThumbsUp, FiZap } from 'react-icons/fi'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'

function StatCard({ icon: Icon, label, value, color = 'amber' }) {
  const colors = {
    amber: 'text-amber-500 bg-amber-500/10',
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
  }
  return (
    <div className="studio-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const [analytics, setAnalytics] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/analytics/dashboard').catch(() => null),
      api.get('/projects/').catch(() => null),
    ]).then(([a, p]) => {
      setAnalytics(a?.data)
      setProjects(p?.data || [])
      setLoading(false)
    })
  }, [])

  const ov = analytics?.overview || {}

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, <span className="text-amber-500">{user?.username}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Your cinematic studio is ready.</p>
        </div>
        <Link to="/projects" className="studio-btn flex items-center gap-2">
          <FiPlus size={16} />
          New Project
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FiFolder} label="Total Projects" value={ov.total_projects} color="amber" />
        <StatCard icon={FiVideo} label="Videos Created" value={ov.total_videos} color="blue" />
        <StatCard icon={FiEye} label="Total Views" value={ov.total_views?.toLocaleString()} color="green" />
        <StatCard icon={FiThumbsUp} label="Total Likes" value={ov.total_likes?.toLocaleString()} color="purple" />
      </div>

      {/* Pipeline & Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="studio-card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <FiZap className="text-amber-500" /> Quick Actions
          </h3>
          <div className="space-y-2">
            {[
              { to: '/scripts', label: 'Generate Script', desc: 'AI-powered story creation' },
              { to: '/storyboard', label: 'Create Storyboard', desc: 'Visual scene planning' },
              { to: '/videos', label: 'Generate Video', desc: 'Cinematic video pipeline' },
              { to: '/voiceover', label: 'Add Voiceover', desc: 'AI voice narration' },
              { to: '/publishing', label: 'Schedule Upload', desc: 'Multi-platform publishing' },
            ].map(({ to, label, desc }) => (
              <Link key={to} to={to} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-[#2a2a2a] transition-all group">
                <div>
                  <div className="text-white text-sm font-medium">{label}</div>
                  <div className="text-gray-500 text-xs">{desc}</div>
                </div>
                <FiZap className="text-gray-600 group-hover:text-amber-500 transition-colors" size={14} />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        <div className="lg:col-span-2 studio-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <FiFolder className="text-amber-500" /> Recent Projects
            </h3>
            <Link to="/projects" className="text-amber-500 text-sm hover:text-amber-400">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 shimmer rounded-lg" />)}</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-gray-600 mb-3">No projects yet</div>
              <Link to="/projects" className="studio-btn-outline text-sm">Create your first project</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all border border-transparent hover:border-[#2a2a2a]">
                  <div>
                    <div className="text-white text-sm font-medium">{p.title}</div>
                    <div className="text-gray-500 text-xs">{p.genre || 'No genre'} · {Math.round(p.duration_target / 60)} min</div>
                  </div>
                  <span className={`status-badge status-${p.status}`}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Platform Stats */}
      {analytics?.platform_stats && (
        <div className="studio-card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <FiTrendingUp className="text-amber-500" /> Platform Performance
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics.platform_stats.map(stat => (
              <div key={stat.platform} className="bg-[#111] rounded-xl p-4 border border-[#2a2a2a]">
                <div className="text-gray-400 text-sm font-medium mb-2">{stat.platform}</div>
                <div className="text-white text-xl font-bold">{stat.views?.toLocaleString()}</div>
                <div className="text-gray-500 text-xs mt-1">views</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
