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
    api.put(`${API_ENDPOINTS.ORDERS}/${id}/status`, payload),
    
  updateItems: (id: string | number, updatedOrder: any) => 
    api.put(`${API_ENDPOINTS.ORDERS}/${id}/items`, updatedOrder),

  // Custom Transactions
  getTransactions: () => api.get(API_ENDPOINTS.TRANSACTIONS),
  createTransaction: (data: any) => api.post(API_ENDPOINTS.TRANSACTIONS, data),
};
