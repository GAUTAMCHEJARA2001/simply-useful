export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000/api';

export const getAuthToken = (): string | null => localStorage.getItem('auth_token');
export const setAuthToken = (token: string): void => localStorage.setItem('auth_token', token);
export const removeAuthToken = (): void => localStorage.removeItem('auth_token');

export interface ApiClientOptions extends Omit<RequestInit, 'body'> {
  data?: any;
}

/**
 * Mock API client - returns empty data since no backend is available.
 * All inventory/API calls will gracefully return empty results.
 */
export const apiClient = async <T>(_endpoint: string, _options: ApiClientOptions = {}): Promise<T> => {
  // No backend available - return empty response
  return [] as unknown as T;
};
