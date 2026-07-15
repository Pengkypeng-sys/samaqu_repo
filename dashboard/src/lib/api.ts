import axios from 'axios';

export const STORAGE_KEY_URL = 'samaqu_api_url';

export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY_URL);
    if (saved) return saved;
  }
  return process.env.NEXT_PUBLIC_API_URL || '';
}

export const api = axios.create();

api.interceptors.request.use((config) => {
  if (!config.baseURL) config.baseURL = getApiUrl();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
