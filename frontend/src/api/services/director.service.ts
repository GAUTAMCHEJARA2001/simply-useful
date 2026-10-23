import { api } from '../client';

export interface DirectorDashboardParams {
  period?: 'today' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom';
  start_date?: string;
  end_date?: string;
}

export interface DirectorDashboardData {
  meta: {
    period: string;
    period_label: string;
    start_date: string;
    end_date: string;
    days_in_period: number;
    company_name: string;
  };
  ticker: {
    gross_sales: number;
    sales_growth_pct: number;
    net_sales: number;
    order_count: number;
    units_sold: number;
    rm_consumption: number;
    cogs_ratio_pct: number;
    gross_profit: number;
    gross_margin_pct: number;
    total_payroll: number;
    payroll_ratio_pct: number;
    fixed_headcount: number;
    variable_headcount: number;
    collections: number;
    collection_strike_pct: number;
    receivables_outstanding: number;
    dso_days: number;
    operational_overhead: number;
    approved_credit_notes: number;
    net_operating_surplus: number;
    net_operating_margin_pct: number;
  };
  operations: {
    plant: {
      units_produced: number;
      batches_completed: number;
      avg_batch_units: number;
      capacity_utilization_pct: number;
      material_yield_pct: number;
      supervisors: string[];
      facility_name: string;
    };
    field: {
      total_visits: number;
      converted_orders: number;
      strike_rate_pct: number;
      travel_km: number;
      revenue_per_km: number;
      field_cost_ratio_pct: number;
    };
    pending_actions: {
      pending_cns_count: number;
      pending_cns_amount: number;
      pending_exp_count: number;
      pending_exp_amount: number;
    };
  };
  top_margin_products: Array<{
    id: string;
    name: string;
    code: string;
    units_sold: number;
    revenue: number;
    cogs: number;
    gross_profit: number;
    margin_pct: number;
  }>;
  waterfall: Array<{
    label: string;
    amount: number;
    type: 'REVENUE' | 'EXPENSE' | 'SUBTOTAL' | 'TOTAL';
    pct: number;
  }>;
  trend: Array<{
    month: string;
    sales: number;
    collections: number;
    cogs: number;
    surplus: number;
  }>;
}

export const directorService = {
  getDashboard: (params?: DirectorDashboardParams) => {
    const query = new URLSearchParams();
    if (params?.period) query.append('period', params.period);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    const qs = query.toString();
    return api.get<{ success: boolean; data: DirectorDashboardData; message: string }>(
      `/director/dashboard${qs ? `?${qs}` : ''}`
    );
  },
};
