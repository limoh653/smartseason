import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.PROD
    ? "https://smartseason-07cd.onrender.com"
    : "http://localhost:8000"   // ← was missing the opening quote
);

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,  // send cookies automatically on every request
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url    = error.config?.url || ''
    const status = error.response?.status

    // 401 on /me/ is expected when not logged in —
    // let AuthContext handle it, don't redirect here
    if (status === 401 && !url.includes('/api/auth/me/')) {
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default api;