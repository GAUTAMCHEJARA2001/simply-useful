import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';

/**
 * PARTY SERVICE (ELITE)
 * Features: Dealers and Distributors management.
 */
export const partyService = {
  getDealers: () => api.get(API_ENDPOINTS.DEALERS),
  getDistributors: () => api.get(API_ENDPOINTS.DISTRIBUTORS),
  
  createDealer: (data: any) => api.post(API_ENDPOINTS.DEALERS, data),
  updateDealer: (code: string, data: any) => api.put(`${API_ENDPOINTS.DEALERS}/${code}`, data),
  deleteDealer: (code: string) => api.delete(`${API_ENDPOINTS.DEALERS}/${code}`),
  
  createDistributor: (data: any) => api.post(API_ENDPOINTS.DISTRIBUTORS, data),
  updateDistributor: (name: string, data: any) => api.put(`${API_ENDPOINTS.DISTRIBUTORS}/${name}`, data),
  deleteDistributor: (name: string) => api.delete(`${API_ENDPOINTS.DISTRIBUTORS}/${name}`),
};
