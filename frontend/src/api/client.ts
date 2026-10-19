import axios, { type AxiosRequestConfig } from 'axios';
import { healApiPath } from './routeHealing';
import { setupInterceptors } from './interceptors';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from './tokenStorage';

export { getAccessToken, getRefreshToken, setTokens, clearTokens };

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
  let envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.includes('simply-useful-backend.onrender.com')) {
    envUrl = 'https://api.simply-useful.run.place/api/v1';
  }
  if (envUrl) {
    const trimmed = envUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
  }
  
  // Dynamically resolve to the host machine's IP/hostname running the backend
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  if (hostname.includes('vercel.app')) {
    return 'https://api.simply-useful.run.place/api/v1';
  }
  return `http://${hostname}:4000/api/v1`;
})();

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure unified interceptors immediately after Axios instance creation
setupInterceptors(api);

console.log('🌐 API BASE URL:', API_BASE_URL);

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
