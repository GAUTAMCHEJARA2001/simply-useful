import apiClient, { ApiResponse } from './client';

/**
 * SALES API (ELITE)
 */
export const salesApi = {
  getSales: (): Promise<ApiResponse> => apiClient('/sales'),
  createSale: (data: any): Promise<ApiResponse> => apiClient('/sales', { method: 'POST', data }),
};
