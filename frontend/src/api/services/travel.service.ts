import { api } from '../client';

export interface TourPlanStopItem {
  id?: string;
  travel_log_id?: string | null;
  date?: string;
  stop_order?: number;
  is_unplanned?: boolean;
  dealer_id?: string | null;
  dealer_name: string;
  dealer_location?: string;
  visit_purpose: string;
  target_order_bags?: number;
  target_order_value?: number;
  target_collection_value?: number;
  plan_notes?: string;
  visited?: boolean;
  actual_order_bags?: number;
  actual_order_value?: number;
  actual_collection_value?: number;
  actual_status?: 'COMPLETED' | 'PARTIALLY_FULFILLED' | 'NOT_FULFILLED' | 'CONVERTED_NEW_DEALER' | 'SKIPPED' | 'PENDING';
  shortfall_reason?: string;
  actual_notes?: string;
  visit_photo?: string | null;
  gps_location?: string | null;
  next_visit_date?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
}

export interface DailyTravelLogItem {
  id: string;
  date: string;
  vehicle_type: 'BIKE' | 'CAR' | 'OTHER';
  start_km: number;
  end_km: number | null;
  total_km: number;
  start_photo?: string | null;
  end_photo?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  start_location?: string | null;
  end_location?: string | null;
  so_notes?: string | null;
  visit_summary?: string | null;
  collection_summary?: string | null;
  order_summary?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_km?: number | null;
  hr_notes?: string | null;
  verified_by?: string | null;
  verified_by_email?: string | null;
  verified_at?: string | null;
  user_id: string;
  user_name: string;
  user_email: string;
  total_stops_planned?: number;
  total_stops_visited?: number;
  total_target_bags?: number;
  total_actual_bags?: number;
  total_target_amount?: number;
  total_actual_amount?: number;
  total_target_collection?: number;
  total_actual_collection?: number;
  target_achievement_pct?: number;
  performance_rating?: 'OUTSTANDING' | 'TARGET_ACHIEVED' | 'PARTIAL' | 'UNDERPERFORMED' | 'PENDING';
  stops?: TourPlanStopItem[];
  has_plan_only?: boolean;
  created_at?: string | null;
}

export const travelService = {
  getToday: () => api.get('/travel/today'),

  getPlan: (date?: string) =>
    api.get('/travel/plan', { params: date ? { date } : {} }),

  savePlan: (data: { date?: string; stops: TourPlanStopItem[] }) =>
    api.post('/travel/plan', data),

  addUnplannedStop: (data: Partial<TourPlanStopItem>) =>
    api.post('/travel/stops/unplanned', data),

  punchStopVisit: (data: Partial<TourPlanStopItem> & { stop_id?: string }) =>
    api.post('/travel/stops/punch-visit', data),

  startTrip: (data: {
    start_km: number;
    vehicle_type: string;
    start_photo?: string;
    start_location?: string;
    stops?: TourPlanStopItem[];
  }) => api.post('/travel/start', data),

  endTrip: (data: {
    end_km: number;
    end_photo?: string;
    end_location?: string;
    visit_summary?: string;
    collection_summary?: string;
    order_summary?: string;
    so_notes?: string;
    stops?: TourPlanStopItem[];
  }) => api.post('/travel/end', data),

  getMyHistory: (month?: string) =>
    api.get('/travel/my-history', { params: month ? { month } : {} }),

  getHRLogs: (params?: {
    month?: string;
    date?: string;
    status?: string;
    user_id?: string;
  }) => api.get('/travel/hr/logs', { params }),

  verifyLog: (
    id: string,
    data: {
      action: 'APPROVE' | 'REJECT';
      approved_km?: number;
      hr_notes?: string;
    }
  ) => api.post(`/travel/hr/verify/${id}`, data),

  getSOScorecard: (params?: {
    period?: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    year?: number;
    month?: number;
    week?: number;
    so_email?: string;
  }) => api.get('/travel/so-scorecard', { params }),
};

export interface SOPillarScore {
  name: string;
  score: number;
  max_score: number;
  percentage: number;
  weight_pct: number;
  target_revenue?: number;
  target_bags?: number;
  actual_bags?: number;
  actual_revenue?: number;
  order_count?: number;
  fulfillment_pct?: number;
  [key: string]: any;
}


export interface SOScorecardOfficer {
  rank: number;
  user_id: string;
  name: string;
  email: string;
  territory: string;
  role: string;
  composite_score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  badge: 'ELITE' | 'ACHIEVER' | 'CONSISTENT' | 'AVERAGE' | 'CRITICAL';
  grade_label: string;
  badge_color: string;
  pillars: {
    orders: SOPillarScore;
    visits: SOPillarScore;
    payments: SOPillarScore;
    onboarding: SOPillarScore;
    discipline: SOPillarScore;
  };
  strengths: string[];
  improvements: string[];
}

export interface SOScorecardData {
  is_admin?: boolean;
  date_range: {
    period: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    year: number;
    month: number;
    week?: number;
    start_date: string;
    end_date: string;
    label: string;
  };
  summary: {
    total_officers: number;
    team_avg_score: number;
    total_team_bags: number;
    total_team_revenue: number;
    total_team_visits: number;
    total_team_collections: number;
    total_team_new_dealers: number;
  };
  officers: SOScorecardOfficer[];
}

