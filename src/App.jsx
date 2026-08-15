import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Home               from './pages/Home'
import Login              from './pages/Login'
import Register           from './pages/Register'
import AdminDashboard     from './pages/AdminDashboard'
import StudentDashboard   from './pages/StudentDashboard'
import RecruiterDashboard from './pages/RecruiterDashboard'
import OAuthInfo          from './pages/OAuthInfo'
import JWTInfo            from './pages/JWTInfo'
import NotFound           from './pages/NotFound'
import MockInterview      from './pages/MockInterview'
import SettingsPage       from './pages/Settings'
import OAuthCallback      from './pages/OAuthCallback'
import ResumeAnalysis     from './pages/ResumeAnalysis'
import './styles/global.css'

function ProtectedRoute({ children, allowedRole }) {
  const { isLoggedIn, user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', color: 'var(--text-secondary)', fontSize: 15,
      }}>
        Loading...
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  if (allowedRole) {
    const roles = Array.isArray(allowedRole) ? allowedRole : [allowedRole]
    if (!roles.includes(user?.role)) {
      const roleMap = { ADMIN: '/admin', RECRUITER: '/recruiter', USER: '/student' }
      return <Navigate to={roleMap[user?.role] || '/login'} replace />
    }
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"               element={<Home />} />
      <Route path="/login"          element={<Login />} />
      <Route path="/register"       element={<Register />} />
      <Route path="/oauth-info"     element={<OAuthInfo />} />
      <Route path="/jwt-info"       element={<JWTInfo />} />
      <Route path="/oauth-callback" element={<OAuthCallback />} />

      <Route path="/settings" element={
        <ProtectedRoute><SettingsPage /></ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute allowedRole="ADMIN"><AdminDashboard /></ProtectedRoute>
      } />

      <Route path="/recruiter" element={
        <ProtectedRoute allowedRole="RECRUITER"><RecruiterDashboard /></ProtectedRoute>
      } />

      <Route path="/student" element={
        <ProtectedRoute allowedRole="USER"><StudentDashboard /></ProtectedRoute>
      } />

      <Route path="/mock-interview" element={
        <ProtectedRoute><MockInterview /></ProtectedRoute>
      } />

      <Route path="/resume-analysis" element={
        <ProtectedRoute><ResumeAnalysis /></ProtectedRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
