import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import StudentDashboard from './pages/StudentDashboard'
import RecruiterDashboard from './pages/RecruiterDashboard'
import OAuthInfo from './pages/OAuthInfo'
import JWTInfo from './pages/JWTInfo'
import NotFound from './pages/NotFound'
import MockInterview from './pages/MockInterview'
import SettingsPage from './pages/Settings'
import './styles/global.css'

function ProtectedRoute({ children, allowedRole }) {
  const isLoggedIn = localStorage.getItem('isLoggedIn')
  const role = localStorage.getItem('role')

  if (!isLoggedIn) {
    return <Navigate to="/login" />
  }

  if (allowedRole && role !== allowedRole) {
    const roleMap = { admin: '/admin', student: '/student', recruiter: '/recruiter' }
    return <Navigate to={roleMap[role] || '/login'} />
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/oauth-info" element={<OAuthInfo />} />
        <Route path="/jwt-info" element={<JWTInfo />} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/admin" element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/student" element={
          <ProtectedRoute allowedRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/recruiter" element={
          <ProtectedRoute allowedRole="recruiter">
            <RecruiterDashboard />
          </ProtectedRoute>
        } />
        <Route path="/mock-interview" element={
          <ProtectedRoute allowedRole="student">
            <MockInterview />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
