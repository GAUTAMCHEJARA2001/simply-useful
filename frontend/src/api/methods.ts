import apiClient from './client';

/**
 * CLEAN HTTP METHODS
 * Standardized wrappers for fetch requests.
 */

export const api = {
  get: (url: string) => apiClient(url, { method: 'GET' }),

  post: (url: string, data: any) =>
    apiClient(url, {
      method: 'POST',
      data,
    }),

  put: (url: string, data: any) =>
    apiClient(url, {
      method: 'PUT',
      data,
    }),

  delete: (url: string) =>
    apiClient(url, {
      method: 'DELETE',
    }),
};
