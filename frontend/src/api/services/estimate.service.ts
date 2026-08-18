import { api } from '../client';

export const estimateService = {
  getAll: () => api.get('/estimates/'),
  getById: (id: string) => api.get(`/estimates/${id}/`),
  create: (data: any) => api.post('/estimates/', data),
  update: (id: string, data: any) => api.put(`/estimates/${id}/`, data),
  delete: (id: string) => api.delete(`/estimates/${id}/`)
};
