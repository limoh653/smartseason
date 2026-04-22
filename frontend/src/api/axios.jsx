import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://smartseason-07cd.onrender.com"
    : "http://localhost:8000");

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const status = error.response?.status;

    // if not logged in it will show a 401 error initially before redirecting to login page
    if (status === 401 && !url.includes("/api/auth/me/")) {
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;