import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { setTokens, clearTokens } from './tokenStorage';
import { normalizeApiError } from './apiError';
import { getRouteHealCandidates, healApiPath } from './routeHealing';
import { toast } from 'sonner';
import { recordLog, logUserError, logPermissionError } from '@/utils/auditLogger';

const IS_DEV = import.meta.env.DEV;

/**
 * Track whether a token refresh is already in-flight so
 * concurrent 401s don't fire multiple refresh calls.
 */
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

function forceLogout() {
  clearTokens();
  localStorage.removeItem('app_user');
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

const isTransientError = (error: any): boolean => {
  if (!error) return false;
  if (!error.response) return true;
  const status = error.response.status;
  return [408, 429, 502, 503, 504].includes(status);
};

let interceptorsAttached = false;

export function setupInterceptors(client: AxiosInstance) {
  if (interceptorsAttached) return;
  interceptorsAttached = true;

  // ── REQUEST INTERCEPTOR ──────────────────────────────────────
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      const originalUrl = config.url;
      config.url = healApiPath(config.url);

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const warehouseId = localStorage.getItem('activeWarehouseId');
      if (warehouseId && config.headers) {
        const hasHeader = config.headers.has ? config.headers.has('X-Warehouse-ID') : !!config.headers['X-Warehouse-ID'];
        if (!hasHeader) {
          if (typeof config.headers.set === 'function') {
            config.headers.set('X-Warehouse-ID', warehouseId);
          } else {
            config.headers['X-Warehouse-ID'] = warehouseId;
          }
        }
      }

      if (config.data instanceof FormData && config.headers) {
        if (typeof config.headers.delete === 'function') {
          config.headers.delete('Content-Type');
        } else {
          delete config.headers['Content-Type'];
        }
      }

      // Auto-log state-changing actions (POST, PUT, PATCH, DELETE)
      const method = (config.method || 'get').toLowerCase();
      const url = config.url || '';
      if (['post', 'put', 'patch', 'delete'].includes(method) && !url.includes('/system/logs')) {
        let feature = 'General';
        let friendlyAction = '';
        const verb = method === 'post' ? 'Created' : method === 'put' || method === 'patch' ? 'Updated' : 'Deleted';

        if (url.includes('/purchases') && url.includes('/orders')) {
          feature = 'Purchase Orders';
          friendlyAction = `${verb} a Purchase Order`;
        } else if (url.includes('/orders') || url.includes('/sales')) {
          feature = 'Sales';
          friendlyAction = `${verb} a Sales Order`;
        } else if (url.includes('/returns')) {
          feature = 'Sales Returns';
          friendlyAction = `${verb} a Sales Return entry`;
        } else if (url.includes('/purchases')) {
          feature = 'Purchases';
          friendlyAction = `${verb} a Purchase entry`;
        } else if (url.includes('/products')) {
          feature = 'Products';
          friendlyAction = `${verb} a Product`;
        } else if (url.includes('/stock') || url.includes('/inventory')) {
          feature = 'Inventory';
          friendlyAction = `${verb} a Stock / Inventory record`;
        } else if (url.includes('/bom')) {
          feature = 'Recipes (BOM)';
          if (url.includes('/approve')) friendlyAction = 'Approved a Recipe (BOM)';
          else if (url.includes('/reject')) friendlyAction = 'Rejected a Recipe (BOM)';
          else friendlyAction = `${verb} a Recipe (BOM)`;
        } else if (url.includes('/production')) {
          feature = 'Production';
          friendlyAction = `${verb} a Production entry`;
        } else if (url.includes('/adjustments')) {
          feature = 'Stock Adjustments';
          friendlyAction = `${verb} a Stock Adjustment`;
        } else if (url.includes('/users')) {
          feature = 'User Management';
          friendlyAction = `${verb} a User account`;
        } else if (url.includes('/leads') || url.includes('/crm')) {
          feature = 'CRM';
          friendlyAction = `${verb} a CRM Lead`;
        } else if (url.includes('/visits')) {
          feature = 'Sales Visits';
          friendlyAction = `${verb} a Sales Visit`;
        } else if (url.includes('/expenses')) {
          feature = 'Expenses';
          friendlyAction = `${verb} an Expense entry`;
        } else if (url.includes('/auth')) {
          feature = 'Login / Auth';
          friendlyAction = 'User logged in or signed up';
        } else if (url.includes('/dealers')) {
          feature = 'Dealers';
          friendlyAction = `${verb} a Dealer`;
        } else if (url.includes('/suppliers')) {
          feature = 'Suppliers';
          friendlyAction = `${verb} a Supplier`;
        } else if (url.includes('/labours')) {
          feature = 'Labour';
          friendlyAction = `${verb} a Labour record`;
        } else if (url.includes('/categories')) {
          feature = 'Categories';
          friendlyAction = `${verb} a Category`;
        } else if (url.includes('/warehouses')) {
          feature = 'Warehouses';
          friendlyAction = `${verb} a Warehouse`;
        } else if (url.includes('/dispatch')) {
          feature = 'Dispatch';
          friendlyAction = `${verb} a Dispatch entry`;
        } else if (url.includes('/broadcast')) {
          feature = 'Broadcasts';
          friendlyAction = `${verb} a Broadcast`;
        } else {
          friendlyAction = `${verb} a record`;
        }

        let itemName = '';
        try {
          const payload = config.data && typeof config.data === 'object' ? config.data : (config.data ? JSON.parse(config.data) : null);
          if (payload) {
            itemName = payload.name || payload.productName || payload.dealerName || payload.dealername || payload.orderid || payload.purchaseid || '';
          }
        } catch {
          // ignore non-JSON payload parsing errors
        }
        if (itemName) friendlyAction += ` — "${itemName}"`;

        recordLog({
          logType: 'ACTION',
          feature,
          action: friendlyAction,
        });
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

  // ── RESPONSE INTERCEPTOR ─────────────────────────────────────
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = (error.config || {}) as (AxiosRequestConfig & { __routeHealRetried?: boolean; __isRetryAfterRefresh?: boolean; __retryCount?: number });
      const status = error.response?.status;
      const serverMsg = error.response?.data?.message || error.response?.data?.error || '';
      const url = originalRequest.url || '';

      // 1. Route-healing retry on 404
      if (status === 404 && !originalRequest.__routeHealRetried) {
        const [candidate] = getRouteHealCandidates(originalRequest);
        if (candidate) {
          originalRequest.__routeHealRetried = true;
          originalRequest.url = candidate;
          if (IS_DEV) console.warn(`Retrying healed route -> ${candidate}`);
          return client.request(originalRequest);
        }
      }

      // 2. Auto-refresh on 401
      if (status === 401 && !originalRequest.__isRetryAfterRefresh) {
        if (url.includes('/auth/refresh') || url.includes('/auth/login')) {
          forceLogout();
          return Promise.reject(normalizeApiError(error));
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((newToken) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              originalRequest.__isRetryAfterRefresh = true;
              return client.request(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        isRefreshing = true;

        try {
          const refreshToken = localStorage.getItem('refresh_token');
          if (!refreshToken) {
            throw new Error('No refresh token');
          }

          const res = await client.post('/auth/refresh', { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = res.data?.data || res.data || {};

          if (!accessToken) {
            throw new Error('Refresh response missing accessToken');
          }

          setTokens(accessToken, newRefreshToken || refreshToken);
          processQueue(null, accessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          originalRequest.__isRetryAfterRefresh = true;
          return client.request(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          forceLogout();
          return Promise.reject(normalizeApiError(error));
        } finally {
          isRefreshing = false;
        }
      }

      // 3. Transient error retry on idempotent GET requests
      const method = (originalRequest.method || 'get').toLowerCase();
      const MAX_RETRIES = 2;
      const RETRY_BASE_DELAY_MS = 600;
      originalRequest.__retryCount = originalRequest.__retryCount || 0;
      if (isTransientError(error) && method === 'get' && originalRequest.__retryCount < MAX_RETRIES) {
        originalRequest.__retryCount += 1;
        const delay = RETRY_BASE_DELAY_MS * originalRequest.__retryCount;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return client.request(originalRequest);
      }

      // 4. Notifications & user-facing error logging (without forcing logout on 403)
      if (!url.includes('/system/logs')) {
        let feature = 'General';
        if (url.includes('/orders') || url.includes('/sales')) feature = 'Sales';
        else if (url.includes('/returns')) feature = 'Sales Returns';
        else if (url.includes('/inventory') || url.includes('/stock')) feature = 'Inventory';
        else if (url.includes('/purchases')) feature = 'Purchases';
        else if (url.includes('/products')) feature = 'Products';
        else if (url.includes('/bom')) feature = 'Recipes (BOM)';
        else if (url.includes('/production')) feature = 'Production';
        else if (url.includes('/users')) feature = 'User Management';
        else if (url.includes('/dealers')) feature = 'Dealers';
        else if (url.includes('/suppliers')) feature = 'Suppliers';

        if (status === 403) {
          toast.error(serverMsg || 'Access Denied: You do not have permission to perform this action.');
          logPermissionError(feature, `Access Denied — User does not have permission to perform this action in ${feature}`, {
            reason: serverMsg || 'Insufficient permissions',
          });
        } else if (status && status >= 500) {
          toast.error(`Server Error: ${serverMsg || 'An unexpected error occurred. Please try again.'}`);
          logUserError(feature, `System Error — Something went wrong while processing a ${feature} request. Please try again.`, {
            reason: serverMsg || 'Internal server error',
          });
        } else if (status === 400 || status === 422) {
          if (['post', 'put', 'patch', 'delete'].includes(method)) {
            toast.error(serverMsg || 'Validation Error: Please check required fields.');
          }
          logUserError(feature, `Invalid Data — The ${feature} form submission was rejected. ${serverMsg ? 'Reason: ' + serverMsg : 'Please check required fields.'}`, {
            reason: serverMsg || 'Validation failed',
          });
        } else if (status === 404) {
          logUserError(feature, `Not Found — The requested ${feature} record could not be found. It may have been deleted.`, {
            reason: serverMsg || 'Record not found',
          });
        } else if (!status) {
          toast.error('Network Error: Unable to reach server. Please check your connection.');
          logUserError(feature, 'Network Error — Connection failed or server is unreachable.', {
            reason: error.message || 'Network disconnected',
          });
        }
      }

      const normalizedError = normalizeApiError(error);
      if (IS_DEV) {
        console.error(
          `[API ERROR ${normalizedError.status || ''}] ${normalizedError.method || ''} ${normalizedError.url || ''} -> ${normalizedError.message || ''}`
        );
      }

      return Promise.reject(normalizedError);
    }
  );
}

