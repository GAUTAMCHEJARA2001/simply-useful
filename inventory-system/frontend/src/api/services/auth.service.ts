import type { AuthResponse, LoginInput, RegisterInput } from '@/types';
import { api, clearTokens, type ApiResponse } from '../client';
import { API_ENDPOINTS } from '../endpoints';

export const authService = {
  login: async (data: LoginInput) => {
    const res = await api.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.LOGIN, data);
    return res.data;
  },

  register: async (data: RegisterInput) => {
    const res = await api.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.REGISTER, data);
    return res.data;
  },

  logout: () => {
    clearTokens();
    localStorage.removeItem('app_user');
    window.location.href = '/login';
  },
};
