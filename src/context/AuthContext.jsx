import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  const saveSession = useCallback((token, userData) => {
    localStorage.setItem('token',     token)
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('role',      userData.role)
    setUser(userData)
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('role')
    setUser(null)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    api.auth.profile()
      .then(data => {
        setUser(data.user)
        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('role', data.user.role)
      })
      .catch(() => clearSession())
      .finally(() => setLoading(false))
  }, [clearSession])

  const register = useCallback(async (name, email, password, role) => {
    const data = await api.auth.register({ name, email, password, role })
    saveSession(data.token, data.user)
    return data.user
  }, [saveSession])

  const login = useCallback(async (email, password) => {
    const data = await api.auth.login({ email, password })
    saveSession(data.token, data.user)
    return data.user
  }, [saveSession])

  const logout = useCallback(async () => {
    try { await api.auth.logout() } catch (_) {}
    clearSession()
  }, [clearSession])

  const updateProfile = useCallback(async (name, email) => {
    const data = await api.auth.updateProfile({ name, email })
    setUser(data.user)
    localStorage.setItem('role', data.user.role)
    return data.user
  }, [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    await api.auth.changePassword({ currentPassword, newPassword })
  }, [])

  const loginWithToken = useCallback((token, userData) => {
    saveSession(token, userData)
  }, [saveSession])

  const value = {
    user, loading,
    register, login, logout,
    updateProfile, changePassword,
    loginWithToken,
    isLoggedIn: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
