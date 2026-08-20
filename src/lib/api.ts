import axios from 'axios';

export const TOKEN_KEY = 'agency_token';
export const AGENCY_KEY = 'agency_profile';

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || typeof envUrl !== 'string' || envUrl.trim() === '') {
    return 'http://localhost:3000/api';
  }
  const clean = envUrl.trim().replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const isLoginCall = config.url?.includes('/agency/auth/login');
  if (!isLoginCall) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginCall = error.config?.url?.includes('/agency/auth/login');
    if (error.response?.status === 401 && !isLoginCall) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(AGENCY_KEY);
      window.dispatchEvent(new Event('agency-logout'));
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}
