import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiZap, FiMail, FiLock, FiUser } from 'react-icons/fi'
import { useAuthStore } from '../store/authStore'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function Register() {
  const [form, setForm] = useState({ email: '', username: '', password: '', full_name: '' })
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      setAuth(data.user, data.access_token)
      toast.success('Account created! Welcome to Reckoning Studio.')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500 mb-3">
            <FiZap className="text-black text-2xl" />
          </div>
          <h1 className="text-2xl font-black text-white">RECKONING STUDIO</h1>
          <p className="text-gray-500 text-sm mt-1">Start creating cinematic stories today</p>
        </div>

        <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Create Account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="studio-input pl-9" placeholder="John Doe" />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
                <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="studio-input pl-7" placeholder="director" required />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="studio-input pl-9" placeholder="you@example.com" required />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1.5">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="studio-input pl-9" placeholder="••••••••" required />
              </div>
            </div>
            <button type="submit" disabled={loading} className="studio-btn w-full mt-2">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-6">
            Have an account?{' '}
            <Link to="/login" className="text-amber-500 hover:text-amber-400 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
