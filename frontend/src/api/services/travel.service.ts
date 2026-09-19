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
  visit_purpose: 'ORDER' | 'PAYMENT' | 'NEW_LEAD' | 'ROUTINE' | 'COMPLAINT' | 'OTHER';
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

  startTrip: (data: {
    start_km: number;
    vehicle_type: string;
    start_photo?: string;
    start_location?: string;
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
};
