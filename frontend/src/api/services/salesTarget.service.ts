import { api } from '../client';

export interface CategoryTargetItem {
  category_id: string;
  category_name: string;
  target_bags: number;
  target_revenue: number;
  actual_bags?: number;
  actual_revenue?: number;
  achievement_pct?: number;
}

export interface ProductTargetItem {
  target_type?: 'product' | 'category' | 'brand';
  product_id?: string;
  product_code?: string;
  product_name?: string;
  category_id?: string;
  category_name?: string;
  brand_id?: string;
  brand_name?: string;
  target_qty: number;
  target_amount?: number;
  incentive_rate?: number;
  actual_qty?: number;
  booked_qty?: number;
  dispatched_qty?: number;
  actual_amount?: number;
  achievement_pct?: number;
  display_name?: string;
}

export interface CustomTargetItem {
  id: string;
  name: string;
  uom: string; // '₹' | 'bags' | 'pkts' | 'boxes' | 'visits' | 'meets' | 'dealers'
  target_val: number;
  actual_val?: number;
  achievement_pct?: number;
  incentive_rate?: number;
}

export interface IncentiveSlabItem {
  min_pct: number;
  max_pct: number;
  rate_per_bag: number;
  label: string;
}

export interface NextTierOpportunity {
  tier_name: string;
  target_pct: number;
  bags_needed: number;
  potential_earnings: number;
  extra_cash: number;
  headline: string;
}

export interface OfficerSalesTargetRecord {
  target_id: string | null;
  is_configured: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    territory: string;
  };
  period: {
    fiscal_year: string;
    year: number;
    month: number;
    period_type: string;
  };
  targets: {
    target_revenue: number;
    target_bags: number;
    target_collection: number;
    target_dealer_revenue: number;
    target_dealer_bags: number;
    target_non_dealer_revenue: number;
    target_non_dealer_bags: number;
    target_visits: number;
    target_new_dealers: number;
    target_travel_days: number;
    category_targets: CategoryTargetItem[];
    product_targets: ProductTargetItem[];
    custom_targets?: CustomTargetItem[];
    incentive_slabs?: IncentiveSlabItem[];
    new_dealer_bounty?: number;
    min_collection_pct_for_incentive?: number;
    min_achievement_pct_for_incentive: number;
    incentive_per_bag: number;
    incentive_pct_on_revenue: number;
    notes: string;
  };
  actuals: {
    actual_revenue: number;
    actual_bags: number;
    ordered_bags?: number;
    dispatched_bags?: number;
    order_count: number;
    actual_collection: number;
    actual_dealer_revenue: number;
    actual_dealer_bags: number;
    actual_non_dealer_revenue: number;
    actual_non_dealer_bags: number;
    actual_visits: number;
    actual_new_dealers: number;
    actual_travel_days: number;
  };
  fulfillment: {
    revenue_pct: number;
    bags_pct: number;
    overall_pct: number;
    collection_pct: number;
    is_qualified_for_incentive: boolean;
    estimated_incentive: number;
    gross_incentive?: number;
    base_incentive?: number;
    custom_incentive_kicker?: number;
    dealer_bounty_earned?: number;
    active_tier?: string;
    collection_penalty_applied?: boolean;
    collection_penalty_msg?: string;
    next_tier?: NextTierOpportunity;
  };
}


export interface SalesTargetListResponse {
  is_admin: boolean;
  filter: {
    year: number;
    month: number;
    fiscal_year: string;
    period_type: string;
    date_range_label: string;
  };
  summary: {
    total_officers: number;
    configured_officers: number;
    total_target_revenue: number;
    total_actual_revenue: number;
    total_target_bags: number;
    total_actual_bags: number;
    total_target_collection: number;
    total_actual_collection: number;
    total_target_dealer_bags: number;
    total_actual_dealer_bags: number;
    total_target_non_dealer_bags: number;
    total_actual_non_dealer_bags: number;
    overall_achievement_pct: number;
  };
  officers: OfficerSalesTargetRecord[];
}

export interface TargetMastersResponse {
  officers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    territory: string;
    monthlytarget: number;
  }>;
  categories: Array<{ id: string; name: string; parent_id?: string | number | null }>;
  brands: Array<{ id: string; name: string }>;
  products: Array<{
    id: string;
    code: string;
    name: string;
    bag_size: string;
    rate: number;
    category_id: string;
    brand_id: string;
  }>;
}

export const salesTargetService = {
  getTargets: (params?: {
    year?: number;
    month?: number;
    fiscal_year?: string;
    user_id?: string;
    period_type?: string;
  }) => api.get<SalesTargetListResponse>('/hr/sales-targets', { params }),

  saveTarget: (data: any) => api.post<{ message: string; target_id: string }>('/hr/sales-targets/save', data),

  copyPreviousTargets: (data: {
    from_year: number;
    from_month: number;
    to_year: number;
    to_month: number;
    growth_pct?: number;
  }) => api.post<{ message: string; copied_count: number }>('/hr/sales-targets/copy-previous', data),

  getMasters: () => api.get<TargetMastersResponse>('/hr/sales-targets/masters'),
};
