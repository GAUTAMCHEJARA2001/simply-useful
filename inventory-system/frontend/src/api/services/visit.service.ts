import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export const visitService = {
  get: () => api.get(API_ENDPOINTS.VISITS),
  add: (data: any) => api.post(API_ENDPOINTS.VISITS, data),
};
