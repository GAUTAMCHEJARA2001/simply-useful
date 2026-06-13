import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export const visitService = {
  get: () => api.get(API_ENDPOINTS.VISITS),
  add: (data: any) => api.post(API_ENDPOINTS.VISITS, data),
  updateStatus: (id: string, visitStatus: string, hrRemark?: string) =>
    api.patch(`${API_ENDPOINTS.VISITS}/${id}/verify`, { visitStatus, hrRemark }),
};
