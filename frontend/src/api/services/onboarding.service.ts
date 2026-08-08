import { api } from '../client';
import { PartyOnboardingRequest } from '../../types';

export const onboardingService = {
  getAll: async () => {
    const response = await api.get('/onboarding');
    const data = response.data;
    return data.results || data.data || data || [];
  },

  create: async (formData: FormData) => {
    const response = await api.post('/onboarding', formData);
    return response.data;
  },

  update: async (id: string, formData: FormData) => {
    const response = await api.put(`/onboarding/${id}`, formData);
    return response.data;
  },

  verify: async (id: string, status: 'APPROVED' | 'REJECTED', remarks?: string, fieldReviews?: any) => {
    const response = await api.patch(`/onboarding/${id}/verify`, { status, remarks, fieldReviews });
    return response.data;
  },
  
  finalizeAndCreateDealer: async (id: string, formData: FormData) => {
    const response = await api.post(`/onboarding/${id}/finalize_and_create_dealer`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};
