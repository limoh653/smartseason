/**
 * Axios instance configured for the SmartSeason API.
 * Uses httpOnly cookies for auth — no tokens in localStorage.
 */
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.PROD
    ? "https://smartseason-07cd.onrender.com"
    : "http://localhost:8000",                          // empty in dev — Vite proxy handles /api requests
  withCredentials: true,           // send cookies automatically on every request
});




api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    const status = error.response?.status
    
    if (status === 401 && !url.includes('/api/auth/me/')) {
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default api;