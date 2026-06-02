import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';

/**
 * INVENTORY SERVICE (ELITE)
 * Features: Product CRUD, master data associations.
 */
export const inventoryService = {
  getAll: () => api.get(API_ENDPOINTS.PRODUCTS),
  getById: (id: string | number) => api.get(`${API_ENDPOINTS.PRODUCTS}/${id}`),
  create: (data: any) => api.post(API_ENDPOINTS.PRODUCTS, data),
  update: (id: string | number, data: any) => api.put(`${API_ENDPOINTS.PRODUCTS}/${id}`, data),
  remove: (id: string | number) => api.delete(`${API_ENDPOINTS.PRODUCTS}/${id}`),

  // Master Data
  getCategories: () => api.get(API_ENDPOINTS.MASTERS.CATEGORIES),
  getBrands: () => api.get(API_ENDPOINTS.MASTERS.BRANDS),
  getWarehouses: () => api.get(API_ENDPOINTS.MASTERS.WAREHOUSES),
  getUnits: () => api.get(API_ENDPOINTS.MASTERS.UNITS),
  getMarkets: () => api.get(API_ENDPOINTS.MASTERS.MARKETS),
  getRegions: () => api.get(API_ENDPOINTS.MASTERS.REGIONS),
  getProductsMaster: () => api.get(API_ENDPOINTS.MASTERS.PRODUCTS),
};
