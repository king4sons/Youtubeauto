import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiZap, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuthStore } from '../store/authStore'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      setAuth(data.user, data.access_token)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 mb-4">
            <FiZap className="text-black text-3xl" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">RECKONING</h1>
          <p className="text-amber-500 font-semibold tracking-widest text-sm">STUDIO</p>
          <p className="text-gray-500 text-sm mt-2">Cinematic stories, powered by AI</p>
        </div>

        {/* Form */}
        <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Sign In</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="studio-input pl-9"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="studio-input pl-9 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  {showPass ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="studio-btn w-full mt-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-6">
            No account?{' '}
            <Link to="/register" className="text-amber-500 hover:text-amber-400 font-medium">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
