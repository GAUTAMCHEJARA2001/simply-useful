import { api } from '../client';

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
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_km?: number | null;
  hr_notes?: string | null;
  verified_by?: string | null;
  verified_by_email?: string | null;
  verified_at?: string | null;
  user_id: string;
  user_name: string;
  user_email: string;
  created_at?: string | null;
}

export const travelService = {
  getToday: () => api.get('/travel/today'),

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
    so_notes?: string;
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
