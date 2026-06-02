import axios, { type AxiosRequestConfig } from 'axios';

/**
 * STANDARD API RESPONSE STRUCTURE
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  meta?: any;
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

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
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔥 Debug (VERY IMPORTANT)
console.log('🌐 API BASE URL:', API_BASE_URL);

const normalizeLegacyPath = (path: string) => {
  let normalized = path.startsWith('/') ? path : `/${path}`;

  // Older screens still prefix app routes with /inv even though the API base
  // is already /api/v1.
  if (normalized === '/inv') {
    normalized = '/';
  } else if (normalized.startsWith('/inv/')) {
    normalized = normalized.slice(4);
  }

  // Keep legacy UI routes working against the current backend shape.
  normalized = normalized.replace(/^\/transactions\/sales(?=\/|$)/, '/sales');

  return normalized;
};

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
    url: normalizeLegacyPath(path),
  });

  return response.data;
};

export default apiClient;
