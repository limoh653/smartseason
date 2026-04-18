/**
 * PrivateRoute — wraps protected pages.
 * Redirects unauthenticated users to /login.
 * Optionally restricts access to a specific role ('admin' | 'agent').
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  // Wait until auth state is ready
  if (loading) return null;

  // Not logged in → redirect
  if (!user) return <Navigate to="/login" replace />;

  // Role check
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}