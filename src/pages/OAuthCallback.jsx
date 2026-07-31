import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function OAuthCallback() {
  const [params]           = useSearchParams()
  const navigate           = useNavigate()
  const { loginWithToken } = useAuth()

  useEffect(() => {
    const token    = params.get('token')
    const role     = params.get('role')
    const error    = params.get('error')
    const provider = decodeURIComponent(params.get('provider') || 'GOOGLE')
    const name     = decodeURIComponent(params.get('name')     || '')
    const email    = decodeURIComponent(params.get('email')    || '')
    const avatar   = decodeURIComponent(params.get('avatar')   || '')

    if (error || !token || !role) {
      navigate('/login?error=oauth_failed', { replace: true })
      return
    }

    const user = {
      role,
      provider,
      name:   name   || undefined,
      email:  email  || undefined,
      avatar: avatar || undefined,
    }

    loginWithToken(token, user)

    const roleMap = { ADMIN: '/admin', RECRUITER: '/recruiter', USER: '/student' }
    navigate(roleMap[role] || '/student', { replace: true })
  }, [params, navigate, loginWithToken])

  const provider = decodeURIComponent(params.get('provider') || 'GOOGLE')
  const label    = provider === 'GITHUB' ? 'GitHub' : 'Google'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: 12,
      color: 'var(--text-secondary)', fontSize: 15,
    }}>
      <div style={{
        width: 32, height: 32,
        border: '3px solid var(--primary)',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      Completing {label} sign-in...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default OAuthCallback
