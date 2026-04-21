/**
 * Axios instance for SmartSeason API
 * - Uses httpOnly cookies (withCredentials)
 * - Works in both development (Vite proxy) and production (Render)
 */

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.PROD
    ? "https://smartseason-07cd.onrender.com/api" // ✅ production backend
    : "/api",                                     // ✅ Vite proxy in dev
  withCredentials: true,                          // ✅ send cookies
});

// ======================
// RESPONSE INTERCEPTOR
// ======================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const status = error.response?.status;

    // ✅ Handle unauthorized users safely
    if (status === 401) {
      // Avoid redirect loop for auth check endpoint
      if (!url.includes("/auth/me")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;