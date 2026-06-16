import axios, { type AxiosRequestConfig } from 'axios';
import { healApiPath } from './routeHealing';

/**
 * STANDARD API RESPONSE STRUCTURE
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  meta?: any;
}

const API_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  
  // Dynamically resolve to the host machine's IP/hostname running the backend
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:4000/api/v1`;
})();


/**
 * TOKEN MANAGEMENT helpers
 */
export const getAccessToken = () => localStorage.getItem('token');
export const setTokens = (token: string, refresh: string) => {
  localStorage.setItem('token', token);
  localStorage.setItem('refresh_token', refresh);
};
export const clearTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
};


/**
 * AXIOS INSTANCE (ELITE)
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔥 Debug (VERY IMPORTANT)
console.log('🌐 API BASE URL:', API_BASE_URL);

/**
 * DEFAULT EXPORT (apiClient)
 * Used by legacy modules and newer service wrappers.
 */
const apiClient = async <T = any>(
  path: string,
  config: AxiosRequestConfig = {}
): Promise<ApiResponse<T>> => {
  const response = await api.request<ApiResponse<T>>({
    ...config,
    url: healApiPath(path),
  });

  return response.data;
};

export default apiClient;
