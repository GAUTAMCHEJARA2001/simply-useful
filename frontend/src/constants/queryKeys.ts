/**
 * Centralized React Query keys for the entire application.
 * Use these to ensure consistency and avoid typos during invalidation.
 */
export const QUERY_KEYS = {
  brands: ['brands'] as const,
  categories: ['categories'] as const,
  products: ['products'] as const,
  warehouses: ['warehouses'] as const,
  units: ['units'] as const,
  dashboardKpis: ['dashboard-kpis'] as const,
  orders: ['orders'] as const,
  users: ['users'] as const,
  inventory: ['inventory'] as const,
} as const;
