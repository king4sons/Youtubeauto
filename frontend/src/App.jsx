import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ScriptGenerator from './pages/ScriptGenerator'
import StoryboardPage from './pages/StoryboardPage'
import VideoGenerator from './pages/VideoGenerator'
import VoiceoverStudio from './pages/VoiceoverStudio'
import VideoEditor from './pages/VideoEditor'
import Publishing from './pages/Publishing'
import Analytics from './pages/Analytics'
import Workflow from './pages/Workflow'
import Settings from './pages/Settings'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="scripts" element={<ScriptGenerator />} />
        <Route path="storyboard" element={<StoryboardPage />} />
        <Route path="videos" element={<VideoGenerator />} />
        <Route path="workflow" element={<Workflow />} />
        <Route path="voiceover" element={<VoiceoverStudio />} />
        <Route path="editor" element={<VideoEditor />} />
        <Route path="publishing" element={<Publishing />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
