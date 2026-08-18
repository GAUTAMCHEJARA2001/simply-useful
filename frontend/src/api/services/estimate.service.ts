import { apiClient } from '../client';

export const estimateService = {
  getAll: () => apiClient.get('/estimates/'),
  getById: (id: string) => apiClient.get(`/estimates/${id}/`),
  create: (data: any) => apiClient.post('/estimates/', data),
  update: (id: string, data: any) => apiClient.put(`/estimates/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/estimates/${id}/`)
};
