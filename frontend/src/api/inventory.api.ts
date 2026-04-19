import apiClient, { ApiResponse } from './client';

/**
 * INVENTORY API (ELITE)
 */
export const inventoryApi = {
  getAll: (): Promise<ApiResponse> => apiClient('/products'),
  getById: (id: string): Promise<ApiResponse> => apiClient(`/products/${id}`),
  create: (data: any): Promise<ApiResponse> => apiClient('/products', { method: 'POST', data }),
  update: (id: string, data: any): Promise<ApiResponse> => apiClient(`/products/${id}`, { method: 'PUT', data }),
  delete: (id: string): Promise<ApiResponse> => apiClient(`/products/${id}`, { method: 'DELETE' }),
};
