/**
 * Axios instance configured for the SmartSeason API.
 * Uses httpOnly cookies for auth — no tokens in localStorage.
 */
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.PROD
    ? "https://smartseason-07cd.onrender.com"
    : "",                          // empty in dev — Vite proxy handles /api requests
  withCredentials: true,           // send cookies automatically on every request
});


// Handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Cookie expired or invalid — redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;