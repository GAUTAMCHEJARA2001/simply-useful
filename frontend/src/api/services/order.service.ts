import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';

/**
 * ORDER SERVICE (ELITE)
 * Features: Sales and Order management.
 */
export const orderService = {
  getAll: () => api.get(API_ENDPOINTS.ORDERS),
  getById: (id: string | number) => api.get(`${API_ENDPOINTS.ORDERS}/${id}`),
  create: (data: any) => api.post(API_ENDPOINTS.ORDERS, data),
  
  updateStatus: (id: string | number, payload: { status: string; reason?: string; actionDate?: string }) => 
    api.post(`${API_ENDPOINTS.ORDERS}/${id}/update-status`, payload),
    
  updateItems: (id: string | number, updatedOrder: any) => 
    api.put(`${API_ENDPOINTS.ORDERS}/${id}`, updatedOrder),

  partialDispatch: (id: string | number, payload: any) =>
    api.post(`${API_ENDPOINTS.ORDERS}/${id}/partial-dispatch`, payload),

  partialReturn: (id: string | number, payload: any) =>
    api.post(`${API_ENDPOINTS.ORDERS}/${id}/partial-return`, payload),

  getDispatchLogs: (id: string | number) =>
    api.get(`${API_ENDPOINTS.ORDERS}/${id}/dispatch-logs`),

  getReturnLogs: (id: string | number) =>
    api.get(`${API_ENDPOINTS.ORDERS}/${id}/return-logs`),

  // Custom Transactions
  getTransactions: () => api.get(API_ENDPOINTS.TRANSACTIONS),
  createTransaction: (data: any) => api.post(API_ENDPOINTS.TRANSACTIONS, data),

  updateDispatchLog: (id: string | number, data: any) =>
    api.put(`/transactions/dispatch-logs/${id}`, data),
  deleteDispatchLog: (id: string | number) =>
    api.delete(`/transactions/dispatch-logs/${id}`),
};
