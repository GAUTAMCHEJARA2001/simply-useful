/**
 * Centralized React Query keys for the entire application.
 * Use these to ensure consistency and avoid typos during invalidation.
 *
 * Convention:
 *  - Static master data (products, warehouses, etc.) → plain array keys
 *  - Time-series data (orders, reports, dashboard KPIs) → factory functions
 *    that include the FY so switching FY busts only the relevant cache entries
 */
export const QUERY_KEYS = {
  // ── Master / static data (not FY-scoped) ──────────────────────────────────
  brands:       ['brands']       as const,
  categories:   ['categories']   as const,
  products:     ['products']     as const,
  warehouses:   ['warehouses']   as const,
  units:        ['units']        as const,
  users:        ['users']        as const,
  inventory:    ['inventory']    as const,
  dealers:      ['dealers']      as const,
  distributors: ['distributors'] as const,
  visits:       ['visits']       as const,
  expenses:     ['expenses']     as const,
  settings:     ['settings']     as const,

  // ── Transactions ────────────────────────────────────────────────────────
  sales:         ['sales']         as const,
  purchases:     ['purchases']     as const,
  productions:   ['productions']   as const,
  approvals:     ['approvals']     as const,
  returns:       ['returns']       as const,

  // ── HR & Travel ─────────────────────────────────────────────────────────
  employees:     ['hr_employees']  as const,
  attendance:    ['hr_attendance'] as const,
  payroll:       (month?: string) => month ? ['hr_payroll', month] as const : ['hr_payroll'] as const,
  travelToday:   ['travel_today']  as const,
  travelHistory: (month?: string) => month ? ['travel_history', month] as const : ['travel_history'] as const,

  // ── Time-series data (FY-scoped factory functions) ────────────────────────
  /**
   * @param fy - FY string like "2024-25" or "ALL". Omit to get the base key
   *             (useful for broad invalidation of all FY variants).
   */
  orders:        (fy?: string) => fy ? ['orders', fy]         as const : ['orders']         as const,
  dashboardKpis: (fy?: string) => fy ? ['dashboard-kpis', fy] as const : ['dashboard-kpis'] as const,
  salesSummary:  (fy?: string) => fy ? ['reports', 'sales-summary', fy] as const : ['reports', 'sales-summary'] as const,
  dailyReport:   (fy?: string) => fy ? ['reports', 'daily', fy]         as const : ['reports', 'daily']         as const,
  lowStock:      ()            => ['reports', 'low-stock'] as const, // stock is not FY-scoped
} as const;
