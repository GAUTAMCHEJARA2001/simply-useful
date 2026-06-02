import { api } from '../client';
import { API_ENDPOINTS } from '../endpoints';

/**
 * SETTINGS SERVICE (ELITE)
 * Features: Management of configuration settings and role permissions.
 */
export const settingsService = {
  // Global Settings
  get: () => api.get(`${API_ENDPOINTS.SETTINGS}?t=${Date.now()}`),
  update: (key: string, value: any) => 
    api.put(API_ENDPOINTS.SETTINGS, { key, value }),

  // Role Permissions
  updatePermission: (id: string | number, isEnabled: boolean) => 
    api.put(`${API_ENDPOINTS.PERMISSIONS}/${id}`, { isEnabled }),
};
