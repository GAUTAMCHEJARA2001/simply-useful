import axios, { AxiosError } from 'axios';

export type ApiErrorKind =
  | 'network'
  | 'auth'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'server'
  | 'unknown';

export type NormalizedApiError = Error & {
  kind: ApiErrorKind;
  status?: number;
  data?: unknown;
  url?: string;
  method?: string;
  retryable: boolean;
};

const getKind = (status?: number): ApiErrorKind => {
  if (!status) return 'network';
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'not_found';
  if (status === 400 || status === 422) return 'validation';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'server';
  return 'unknown';
};

export const normalizeApiError = (error: unknown): NormalizedApiError => {
  if (!axios.isAxiosError(error)) {
    const normalized = new Error(error instanceof Error ? error.message : 'Unexpected error') as NormalizedApiError;
    normalized.kind = 'unknown';
    normalized.retryable = false;
    return normalized;
  }

  const axiosError = error as AxiosError<any>;
  const status = axiosError.response?.status;
  const data = axiosError.response?.data;
  const message =
    data?.message ||
    data?.error ||
    axiosError.message ||
    'Request failed';

  const normalized = new Error(message) as NormalizedApiError;
  normalized.name = 'ApiError';
  normalized.kind = getKind(status);
  normalized.status = status;
  normalized.data = data;
  normalized.url = axiosError.config?.url;
  normalized.method = axiosError.config?.method?.toUpperCase();
  normalized.retryable = !status || status === 408 || status === 429 || status >= 500;

  return normalized;
};
