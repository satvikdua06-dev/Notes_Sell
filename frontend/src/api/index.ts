import axios from 'axios';

const apiBase = import.meta.env.VITE_API_URL || '/api';

if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  console.info('[api] VITE_API_URL not set — using Vite dev proxy (/api → localhost:4000). Set it in .env.local for a different backend.');
}
if (!import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  console.warn('[api] VITE_API_URL is not set in this production build. API calls will use relative /api paths and will fail on Vercel — set VITE_API_URL to your Render backend URL.');
}

// In production, VITE_API_URL points at the Render backend so requests bypass
// Vercel's SPA rewrite entirely. Falls back to the Vite dev proxy in local dev.
const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // Redirect to login only if not already on auth pages
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/signup')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
