import axios from 'axios';

export const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
let accessToken = '';
export function setAccessToken(token: string) { accessToken = token; if (token) (window as any).__ACCESS_TOKEN__ = token; else delete (window as any).__ACCESS_TOKEN__; }
export function getAccessToken() { return accessToken || (window as any).__ACCESS_TOKEN__ || ''; }
export const api = axios.create({ baseURL: apiBase, withCredentials: true });
let refreshPromise: Promise<string> | null = null;
api.interceptors.request.use(config => { const token = getAccessToken(); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use(r => r, async error => {
  const original = error.config;
  if (error.response?.status !== 401 || !original || original._retry || String(original.url || '').includes('/auth/refresh')) return Promise.reject(error);
  original._retry = true;
  try {
    if (!refreshPromise) {
      refreshPromise = api.post('/auth/refresh').then(r => { setAccessToken(r.data.accessToken); return r.data.accessToken; }).finally(() => { refreshPromise = null; });
    }
    const token = await refreshPromise;
    original.headers.Authorization = `Bearer ${token}`;
    return api(original);
  } catch (e) { setAccessToken(''); return Promise.reject(e); }
});
