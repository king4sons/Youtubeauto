import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('rs_user') || 'null'),
  token: localStorage.getItem('rs_token') || null,
  isAuthenticated: !!localStorage.getItem('rs_token'),

  setAuth: (user, token) => {
    localStorage.setItem('rs_token', token)
    localStorage.setItem('rs_user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('rs_token')
    localStorage.removeItem('rs_user')
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
