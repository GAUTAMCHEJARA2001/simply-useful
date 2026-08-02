import axios, { type AxiosRequestConfig } from 'axios';
import { healApiPath } from './routeHealing';
import { recordLog, logUserError, logPermissionError } from '@/utils/auditLogger';

/**
 * STANDARD API RESPONSE STRUCTURE
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  meta?: any;
}

const API_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  
  // Dynamically resolve to the host machine's IP/hostname running the backend
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:4000/api/v1`;
})();

export const getAccessToken = () => localStorage.getItem('token');
export const setTokens = (token: string, refresh: string) => {
  localStorage.setItem('token', token);
  localStorage.setItem('refresh_token', refresh);
};
export const clearTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Auth Headers + Automatic State-Changing Action Logging
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const whId = localStorage.getItem('activeWarehouseId');
  if (whId && config.headers) {
    config.headers['X-Warehouse-Id'] = whId;
  }

  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';

  // Auto-log state changing actions (POST, PUT, PATCH, DELETE) excluding logger endpoint itself
  if (['post', 'put', 'patch', 'delete'].includes(method) && !url.includes('/system/logs')) {
    let feature = 'General';
    let friendlyAction = '';
    const verb = method === 'post' ? 'Created' : method === 'put' || method === 'patch' ? 'Updated' : 'Deleted';

    if (url.includes('/orders') || url.includes('/sales')) {
      feature = 'Sales';
      friendlyAction = `${verb} a Sales Order`;
    } else if (url.includes('/returns')) {
      feature = 'Sales Returns';
      friendlyAction = `${verb} a Sales Return entry`;
    } else if (url.includes('/purchases') && url.includes('/orders')) {
      feature = 'Purchase Orders';
      friendlyAction = `${verb} a Purchase Order`;
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

    // Extract a name from payload if available
    let itemName = '';
    try {
      const payload = config.data && typeof config.data === 'object' ? config.data : (config.data ? JSON.parse(config.data) : null);
      if (payload) {
        itemName = payload.name || payload.productName || payload.dealerName || payload.dealername || payload.orderid || payload.purchaseid || '';
      }
    } catch (e) {}
    if (itemName) friendlyAction += ` — "${itemName}"`;

    recordLog({
      logType: 'ACTION',
      feature,
      action: friendlyAction,
    });
  }

  return config;
});

// Response Interceptor: Automatic Error Logging (403, 500, 400)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config || {};
    const url = config.url || '';
    const status = error.response?.status;
    const serverMsg = error.response?.data?.message || error.response?.data?.error || '';

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
        logPermissionError(feature, `Access Denied — User does not have permission to perform this action in ${feature}`, {
          reason: serverMsg || 'Insufficient permissions',
        });
      } else if (status >= 500) {
        logUserError(feature, `System Error — Something went wrong while processing a ${feature} request. Please try again.`, {
          reason: serverMsg || 'Internal server error',
        });
      } else if (status === 400 || status === 422) {
        logUserError(feature, `Invalid Data — The ${feature} form submission was rejected. ${serverMsg ? 'Reason: ' + serverMsg : 'Please check required fields.'}`, {
          reason: serverMsg || 'Validation failed',
        });
      } else if (status === 404) {
        logUserError(feature, `Not Found — The requested ${feature} record could not be found. It may have been deleted.`, {
          reason: serverMsg || 'Record not found',
        });
      }
    }
    return Promise.reject(error);
  }
);

console.log('🌐 API BASE URL:', API_BASE_URL);

const apiClient = async <T = any>(
  path: string,
  config: AxiosRequestConfig = {}
): Promise<ApiResponse<T>> => {
  const response = await api.request<ApiResponse<T>>({
    ...config,
    url: healApiPath(path),
  });

  return response.data;
};

export default apiClient;
