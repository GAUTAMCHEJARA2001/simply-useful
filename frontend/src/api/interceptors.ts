import { api } from './client';
import { normalizeApiError } from './apiError';
import { getRouteHealCandidates, healApiPath } from './routeHealing';

const IS_DEV = import.meta.env.DEV;

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const originalUrl = config.url;
    config.url = healApiPath(config.url);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const warehouseId = localStorage.getItem('activeWarehouseId');
    if (warehouseId && warehouseId !== 'GLOBAL') {
      const hasHeader = config.headers.has ? config.headers.has('X-Warehouse-ID') : !!config.headers['X-Warehouse-ID'];
      if (!hasHeader) {
        let isSuperadmin = false;
        try {
          const userStr = localStorage.getItem('app_user');
          if (userStr) {
            const user = JSON.parse(userStr);
            isSuperadmin = user.role === 'SUPERADMIN';
          }
        } catch (e) {}

        if (typeof config.headers.set === 'function') {
          config.headers.set('X-Warehouse-ID', warehouseId);
        } else {
          config.headers['X-Warehouse-ID'] = warehouseId;
        }
      }
    }

    if (IS_DEV) {
      if (originalUrl !== config.url) {
        console.warn(`Route healed: ${originalUrl} -> ${config.url}`);
      }
      console.log(`${config.method?.toUpperCase()} -> ${config.url}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const config = error.config || {};

    if (status === 404 && !config.__routeHealRetried) {
      const [candidate] = getRouteHealCandidates(config);
      if (candidate) {
        config.__routeHealRetried = true;
        config.url = candidate;
        if (IS_DEV) console.warn(`Retrying healed route -> ${candidate}`);
        return api.request(config);
      }
    }

    const normalizedError = normalizeApiError(error);

    if (IS_DEV) {
      console.error('API ERROR:', {
        url: normalizedError.url,
        method: normalizedError.method,
        status: normalizedError.status,
        kind: normalizedError.kind,
        retryable: normalizedError.retryable,
        message: normalizedError.message,
        data: normalizedError.data,
      });
    }

    if (status === 401 || status === 403) {
      if (IS_DEV) console.warn('Session expired or access forbidden -> redirecting to login');

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(normalizedError);
  }
);
