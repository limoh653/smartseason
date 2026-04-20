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
  if (loading) return null;

  // Not logged in it redirects to login page
  if (!user) return <Navigate to="/login" replace />;

  // checks role
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}