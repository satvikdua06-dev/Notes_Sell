import axios from 'axios';

const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  console.info('[api] VITE_API_URL not set — using Vite dev proxy (/api → localhost:4000). Set it in .env.local for a different backend.');
}
if (!import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  console.warn('[api] VITE_API_URL is not set in this production build. API calls will use relative /api paths and will fail on Vercel — set VITE_API_URL to your Render backend URL.');
}

/**
 * Build a full URL for a backend path. Use this for non-axios requests
 * (e.g. <img src>, fetch(), new Image().src) so they go to the same origin
 * as the axios client instead of the Vercel frontend.
 *
 * apiUrl('/chapters/abc/page/1') → 'https://backend.onrender.com/api/chapters/abc/page/1'
 */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${apiBase}${p}`;
}

// In production, VITE_API_URL points at the Render backend so requests bypass
// Vercel's SPA rewrite entirely. Falls back to the Vite dev proxy in local dev.
const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
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
