import React, { useState, useEffect } from 'react'
import { FiBarChart2, FiTrendingUp, FiEye, FiThumbsUp, FiVideo, FiFolder } from 'react-icons/fi'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import api from '../utils/api'

const TOOLTIP_STYLE = { contentStyle: { background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', borderRadius: '8px' } }

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Analytics</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 shimmer rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1,2].map(i => <div key={i} className="h-64 shimmer rounded-xl" />)}
      </div>
    </div>
  )

  const ov = data?.overview || {}

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FiBarChart2 className="text-amber-500" /> Analytics
        </h1>
        <p className="text-gray-500 text-sm mt-1">Performance across all platforms</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: FiEye, label: 'Total Views', value: (ov.total_views || 0).toLocaleString(), sub: 'all platforms', color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { icon: FiThumbsUp, label: 'Total Likes', value: (ov.total_likes || 0).toLocaleString(), sub: 'engagement', color: 'text-amber-400', bg: 'bg-amber-400/10' },
          { icon: FiVideo, label: 'Videos Made', value: ov.total_videos || 0, sub: `${ov.total_shorts || 0} shorts`, color: 'text-green-400', bg: 'bg-green-400/10' },
          { icon: FiFolder, label: 'Projects', value: ov.total_projects || 0, sub: `${ov.total_published || 0} published`, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="studio-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">{label}</span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg}`}>
                <Icon size={16} className={color} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-gray-600 text-xs mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="studio-card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <FiTrendingUp className="text-amber-500" /> Views — Last 30 Days
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data?.recent_performance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={d => d.slice(5)} interval={4} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="views" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#f59e0b' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="studio-card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <FiBarChart2 className="text-amber-500" /> Platform Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.platform_stats || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="platform" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="views" fill="#f59e0b" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Platform detail cards */}
      {data?.platform_stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.platform_stats.map(stat => (
            <div key={stat.platform} className="studio-card p-5">
              <div className="text-amber-500 font-bold mb-3">{stat.platform}</div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Views</span>
                  <span className="text-white font-semibold">{stat.views?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Followers</span>
                  <span className="text-white font-semibold">
                    {(stat.subscribers || stat.followers || 0).toLocaleString()}
                  </span>
                </div>
                {stat.revenue !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Revenue</span>
                    <span className="text-green-400 font-semibold">${stat.revenue}</span>
                  </div>
                )}
                {stat.likes !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Likes</span>
                    <span className="text-white font-semibold">{stat.likes?.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.top_content?.length > 0 && (
        <div className="studio-card p-5">
          <h3 className="font-semibold text-white mb-4">Top Performing Content</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-[#2a2a2a]">
                  <th className="text-left pb-2">Title</th>
                  <th className="text-left pb-2">Platform</th>
                  <th className="text-right pb-2">Views</th>
                  <th className="text-right pb-2">Likes</th>
                  <th className="text-right pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f]">
                {data.top_content.map((item, i) => (
                  <tr key={i} className="text-white">
                    <td className="py-2.5 truncate max-w-48">{item.title}</td>
                    <td className="py-2.5 capitalize text-gray-400">{item.platform}</td>
                    <td className="py-2.5 text-right">{item.views.toLocaleString()}</td>
                    <td className="py-2.5 text-right">{item.likes.toLocaleString()}</td>
                    <td className="py-2.5 text-right"><span className={`status-badge status-${item.status}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
