import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export const userService = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    api.get(API_ENDPOINTS.USERS, { params }),

  getById: (id: string | number) =>
    api.get(`${API_ENDPOINTS.USERS}/${id}`),

  create: (data: any) =>
    api.post(API_ENDPOINTS.USERS, data),

  update: (id: string | number, data: any) =>
    api.put(`${API_ENDPOINTS.USERS}/${id}`, data),

  remove: (id: string | number) =>
    api.delete(`${API_ENDPOINTS.USERS}/${id}`),

  resetPassword: (id: string | number, password: string) =>
    api.put(`${API_ENDPOINTS.USERS}/${id}/password`, { password }),

  updateTarget: (id: string | number, target: number) =>
    api.put(`${API_ENDPOINTS.USERS}/${id}/target`, { target }),

  getAssignments: (id: string | number) =>
    api.get(`/masters/users/${id}/assignments`),

  saveAssignments: (id: string | number, data: any) =>
    api.post(`/masters/users/${id}/assignments`, data),
};
