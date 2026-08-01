import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from './api'

const AuthContext = createContext(null)
const TOKEN_KEY = 'smarthire_token'
const USER_KEY = 'smarthire_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem(USER_KEY) || 'null'))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) { setIsLoading(false); return }
    authApi.profile().then(saveSession).catch(clearSession).finally(() => setIsLoading(false))
  }, [])

  const saveSession = (data) => {
    const currentUser = data.user || data
    if (data.token) localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser))
    setUser(currentUser)
    return currentUser
  }
  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }
  return <AuthContext.Provider value={{ user, isLoading, saveSession, logout: clearSession }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
