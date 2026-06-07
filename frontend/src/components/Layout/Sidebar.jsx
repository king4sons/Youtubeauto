import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  FiGrid, FiFolder, FiFileText, FiFilm, FiVideo,
  FiMic, FiEdit3, FiSend, FiBarChart2, FiLogOut,
  FiZap, FiChevronLeft, FiChevronRight
} from 'react-icons/fi'

const navItems = [
  { to: '/dashboard', icon: FiGrid, label: 'Dashboard' },
  { to: '/projects', icon: FiFolder, label: 'Projects' },
  { to: '/scripts', icon: FiFileText, label: 'Script Agent' },
  { to: '/storyboard', icon: FiFilm, label: 'Storyboard' },
  { to: '/videos', icon: FiVideo, label: 'Video Pipeline' },
  { to: '/voiceover', icon: FiMic, label: 'Voiceover' },
  { to: '/editor', icon: FiEdit3, label: 'Editor' },
  { to: '/publishing', icon: FiSend, label: 'Publishing' },
  { to: '/analytics', icon: FiBarChart2, label: 'Analytics' },
]

export default function Sidebar({ open, setOpen }) {
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className={`${open ? 'w-60' : 'w-16'} flex flex-col bg-[#111] border-r border-[#1f1f1f] transition-all duration-300 relative`}>
      {/* Logo */}
      <div className="p-4 border-b border-[#1f1f1f] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
          <FiZap className="text-black text-lg" />
        </div>
        {open && (
          <div>
            <div className="font-bold text-white text-sm leading-tight">RECKONING</div>
            <div className="text-amber-500 text-xs font-semibold tracking-widest">STUDIO</div>
          </div>
        )}
      </div>

      {/* Toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="absolute -right-3 top-16 w-6 h-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full flex items-center justify-center text-gray-400 hover:text-amber-500 transition-colors z-10"
      >
        {open ? <FiChevronLeft size={12} /> : <FiChevronRight size={12} />}
      </button>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-150 group ${
                isActive
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
            title={!open ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {open && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-[#1f1f1f]">
        {open && user && (
          <div className="flex items-center gap-2 mb-2 px-2">
            <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-black text-xs font-bold flex-shrink-0">
              {(user.username || 'U')[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-white text-xs font-medium truncate">{user.username}</div>
              <div className="text-gray-500 text-xs truncate">{user.email}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition-all w-full"
          title={!open ? 'Logout' : undefined}
        >
          <FiLogOut size={16} className="flex-shrink-0" />
          {open && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </div>
  )
}
