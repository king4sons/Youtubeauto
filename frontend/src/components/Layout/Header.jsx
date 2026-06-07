import React from 'react'
import { FiMenu, FiBell, FiSettings } from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore'

export default function Header({ onMenuClick }) {
  const { user } = useAuthStore()
  return (
    <header className="h-14 border-b border-[#1f1f1f] bg-[#111] flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="text-gray-400 hover:text-white p-1 rounded">
          <FiMenu size={20} />
        </button>
        <span className="text-gray-500 text-sm hidden sm:block">
          Cinematic · AI-Powered · Multi-Platform
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5">
          <FiBell size={18} />
        </button>
        <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5">
          <FiSettings size={18} />
        </button>
        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black text-sm font-bold ml-2">
          {(user?.username || 'U')[0].toUpperCase()}
        </div>
      </div>
    </header>
  )
}
