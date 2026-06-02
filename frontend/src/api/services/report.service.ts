import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export const reportService = {
  dashboard: () =>
    api.get(API_ENDPOINTS.REPORTS.DASHBOARD),

  sales: (filters?: any) =>
    api.get(API_ENDPOINTS.REPORTS.SALES, { params: filters }),

  lowStock: () =>
    api.get(API_ENDPOINTS.REPORTS.LOW_STOCK),

  daily: (date?: string) =>
    api.get(API_ENDPOINTS.REPORTS.DAILY, {
      params: { date },
    }),
};
