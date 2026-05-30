import { AxiosRequestConfig } from 'axios';
import { api, ApiResponse } from './client';

const unwrap = <T>(response: { data: ApiResponse<T> | T }) => {
  const body = response.data as ApiResponse<T>;
  if (body && typeof body === 'object' && 'success' in body) return body.data;
  return response.data as T;
};

export const crudApi = {
  list: async <T = any>(url: string, config?: AxiosRequestConfig) =>
    unwrap<T[]>(await api.get<ApiResponse<T[]>>(url, config)),

  get: async <T = any>(url: string, config?: AxiosRequestConfig) =>
    unwrap<T>(await api.get<ApiResponse<T>>(url, config)),

  create: async <T = any>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(await api.post<ApiResponse<T>>(url, data, config)),

  update: async <T = any>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(await api.put<ApiResponse<T>>(url, data, config)),

  patch: async <T = any>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(await api.patch<ApiResponse<T>>(url, data, config)),

  remove: async <T = any>(url: string, config?: AxiosRequestConfig) =>
    unwrap<T>(await api.delete<ApiResponse<T>>(url, config)),
};
