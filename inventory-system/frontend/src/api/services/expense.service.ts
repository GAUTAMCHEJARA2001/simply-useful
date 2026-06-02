import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export const expenseService = {
  get: () => api.get(API_ENDPOINTS.EXPENSES),
  add: (data: any) => api.post(API_ENDPOINTS.EXPENSES, data),
  update: (id: string | number, data: any) => api.put(`${API_ENDPOINTS.EXPENSES}/${id}`, data),
  updateStatus: (id: string | number, status: string, rejectReason?: string) => 
    api.put(`${API_ENDPOINTS.EXPENSES}/${id}/status`, { status, rejectReason }),
};
