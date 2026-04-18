import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

import Navbar from './components/Navbar'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import AgentDashboard from './pages/AgentDashboard'
import FieldDetail from './pages/FieldDetail'
import ManageFields from './pages/ManageFields'

function DashboardRouter() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return user.role === 'admin' ? <AdminDashboard /> : <AgentDashboard />
}

// Layout wrapper — renders Navbar + page content
function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  )
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout>
                <DashboardRouter />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/fields/:id"
          element={
            <PrivateRoute>
              <Layout>
                <FieldDetail />
              </Layout>
            </PrivateRoute>
          }
        />

        {/* Admin only */}
        <Route
          path="/fields"
          element={
            <PrivateRoute requiredRole="admin">
              <Layout>
                <ManageFields />
              </Layout>
            </PrivateRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}