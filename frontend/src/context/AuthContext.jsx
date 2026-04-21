import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // ─────────────────────────────────────────────
  // Load current user on app start
  // ─────────────────────────────────────────────
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get('/api/auth/me/')
        setUser(res.data)
      } catch (err) {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchMe()
  }, [])

  // ─────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────
  const login = async ({ username, password }) => {
    try {
      await api.post('/api/auth/login/', { username, password })

      // after login, immediately fetch user
      const res = await api.get('/api/auth/me/')
      setUser(res.data)

      return res.data
    } catch (err) {
      setUser(null)
      throw err
    }
  }

  // ─────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────
  const logout = async () => {
    try {
      await api.post('/api/auth/logout/')
    } finally {
      setUser(null)
      window.location.href = '/login'
    }
  }

  // ─────────────────────────────────────────────
  // SAFE ROLE CHECK
  // ─────────────────────────────────────────────
  const isAdmin = () => user?.role === 'admin'

  // ─────────────────────────────────────────────
  // PROVIDER
  // ─────────────────────────────────────────────
  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        isAdmin,
        loading,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}