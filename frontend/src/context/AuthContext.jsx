import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get('/api/auth/me/')
        setUser(res.data)
      } catch {
        // Cookie missing or expired — just set null, don't redirect here
        // The PrivateRoute component handles the redirect to /login
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    fetchMe()
  }, [])  // ← runs only once on mount

  const login = async ({ username, password }) => {
    const res = await api.post('/api/auth/login/', { username, password })
    setUser(res.data.user)
    return res.data.user
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout/')
    } finally {
      setUser(null)
      window.location.href = '/login'
    }
  }

  const isAdmin = () => user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}