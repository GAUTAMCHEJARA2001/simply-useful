export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000/api';

export const getAuthToken = (): string | null => localStorage.getItem('auth_token');
export const setAuthToken = (token: string): void => localStorage.setItem('auth_token', token);
export const removeAuthToken = (): void => localStorage.removeItem('auth_token');

export interface ApiClientOptions extends Omit<RequestInit, 'body'> {
  data?: any;
}

export const apiClient = async <T>(endpoint: string, options: ApiClientOptions = {}): Promise<T> => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.data && !(options.data instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    method: options.method || (options.data ? 'POST' : 'GET'),
    headers,
  };

  if (options.data) {
    if (options.data instanceof FormData) {
      config.body = options.data;
    } else {
      config.body = JSON.stringify(options.data);
    }
  }

  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(`${API_BASE_URL}${path}`, config);

  if (!response.ok && response.status !== 304) {
    const errorData = await response.json().catch(() => null);
    throw {
      status: response.status,
      message: errorData?.message || errorData?.error || 'API Request Failed',
      data: errorData
    };
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text);
};
