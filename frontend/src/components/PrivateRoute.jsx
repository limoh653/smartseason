/**
 * PrivateRoute  which wraps protected pages.
 * Redirects unauthenticated users to /login route.
 * redirects to either admin or field agent
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  // Wait until auth state is ready
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <h2>Loading application... (If backend is asleep, this may take up to 50 seconds)</h2>
      </div>
    );
  }

  // Not logged in it redirects to login page
  if (!user) return <Navigate to="/login" replace />;

  // checks role
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}