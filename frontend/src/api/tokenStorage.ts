/**
 * Dedicated auth token storage helper to avoid circular dependencies
 * between Axios client and interceptors.
 */

export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
};

export const setTokens = (token: string, refresh: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
  localStorage.setItem('refresh_token', refresh);
};

export const clearTokens = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
};
