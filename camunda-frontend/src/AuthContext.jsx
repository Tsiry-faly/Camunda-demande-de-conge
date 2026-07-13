import { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin, logout as apiLogout, fetchMe } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMe()
      .then((data) => setUser(data.authenticated ? data : null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (identifiant, password) => {
    const data = await apiLogin(identifiant, password)
    setUser({ ...data, authenticated: true })
    return data
  }

  const logout = async () => {
    await apiLogout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
