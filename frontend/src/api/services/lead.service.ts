import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export const leadService = {
  getAll: (params?: {
    status?: string;
    priority?: string;
    assigned_to?: string;
    search?: string;
    start?: string;
    end?: string;
  }) =>
    api.get(API_ENDPOINTS.LEADS, { params }),

  getById: (id: string) =>
    api.get(`${API_ENDPOINTS.LEADS}/${id}`),

  create: (data: any) =>
    api.post(API_ENDPOINTS.LEADS, data),

  update: (id: string, data: any) =>
    api.patch(`${API_ENDPOINTS.LEADS}/${id}`, data),

  remove: (id: string) =>
    api.delete(`${API_ENDPOINTS.LEADS}/${id}`),

  moveStage: (id: string, status: string) =>
    api.patch(`${API_ENDPOINTS.LEADS}/${id}/move`, { status }),

  addFollowup: (id: string, type: string, notes: string, nextFollowupDate?: string) =>
    api.post(`${API_ENDPOINTS.LEADS}/${id}/followup`, {
      type,
      notes,
      nextFollowupDate,
    }),

  convertToDealer: (id: string) =>
    api.post(`${API_ENDPOINTS.LEADS}/${id}/convert`),

  getDashboardMetrics: (params?: { start?: string; end?: string }) =>
    api.get(`${API_ENDPOINTS.LEADS}/dashboard`, { params }),
};
