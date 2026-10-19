import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { Expense, StandardApiResponse } from '@/types';

export const expenseService = {
  get: () => api.get<StandardApiResponse<Expense[]>>(API_ENDPOINTS.EXPENSES),
  add: (data: Partial<Expense>) => api.post<StandardApiResponse<Expense>>(API_ENDPOINTS.EXPENSES, data),
  update: (id: string | number, data: Partial<Expense>) => api.put<StandardApiResponse<Expense>>(`${API_ENDPOINTS.EXPENSES}/${id}`, data),
  updateStatus: (id: string | number, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | string, rejectReason?: string) => 
    api.put<StandardApiResponse<Expense>>(`${API_ENDPOINTS.EXPENSES}/${id}/status`, { status, rejectReason }),
};

