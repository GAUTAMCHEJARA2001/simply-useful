export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PERMISSIONS: '/auth/permissions',
  },

  USERS: '/users',

  PRODUCTS: '/products',

  REPORTS: {
    DASHBOARD: '/reports/dashboard-kpis',
    SALES: '/reports/sales-summary',
    LOW_STOCK: '/reports/low-stock',
    DAILY: '/reports/daily',
  },

  MASTERS: {
    CATEGORIES: '/masters/categories',
    BRANDS: '/masters/brands',
    WAREHOUSES: '/masters/warehouses',
    UNITS: '/masters/units',
    MARKETS: '/masters/markets',
    REGIONS: '/masters/regions',
    PRODUCTS: '/masters/products',
    SETTINGS: '/masters/settings',
  },

  DEALERS: '/dealers',
  DISTRIBUTORS: '/distributors',
  SETTINGS: '/masters/settings',
  PERMISSIONS: '/auth/permissions',
  ORDERS: '/sales',
  TRANSACTIONS: '/transactions',
  VISITS: '/visits',
  EXPENSES: '/expenses',
};
