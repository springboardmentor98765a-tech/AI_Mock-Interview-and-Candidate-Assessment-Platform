import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import StudentDashboard from './pages/StudentDashboard'
import RecruiterDashboard from './pages/RecruiterDashboard'
import OAuthInfo from './pages/OAuthInfo'
import JWTInfo from './pages/JWTInfo'
import NotFound from './pages/NotFound'

function ProtectedRoute({ children, allowedRole }) {
  const isLoggedIn = localStorage.getItem('isLoggedIn')
  const role = localStorage.getItem('role')

  if (!isLoggedIn || isLoggedIn !== 'true') {
    return <Navigate to="/login" />
  }

  if (role !== allowedRole) {
    return <Navigate to="/login" />
  }

  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
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
      <Route path="/oauth-info" element={<OAuthInfo />} />
      <Route path="/jwt-info" element={<JWTInfo />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
