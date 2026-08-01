import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import CandidateDashboard from './pages/CandidateDashboard'
import RecruiterDashboard from './pages/RecruiterDashboard'
import AdminDashboard from './pages/AdminDashboard'

const ROLE_PATHS = { USER: '/dashboard/candidate', RECRUITER: '/dashboard/recruiter', ADMIN: '/dashboard/admin' }

function ProtectedRoute({ roles, children }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={ROLE_PATHS[user.role] || '/login'} replace />
  return children
}

function AppRoutes() {
  return <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/dashboard/candidate" element={<ProtectedRoute roles={['USER']}><CandidateDashboard /></ProtectedRoute>} />
    <Route path="/dashboard/recruiter" element={<ProtectedRoute roles={['RECRUITER']}><RecruiterDashboard /></ProtectedRoute>} />
    <Route path="/dashboard/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

export default function App() {
  return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>
}
