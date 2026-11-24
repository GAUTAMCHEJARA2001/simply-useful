import { api, type ApiResponse } from '@/api/client';

export type RtgsStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED';
export type RtgsPayeeCategory = 'SALARY' | 'SUPPLIER' | 'TRANSPORTATION' | 'ELECTRICITY' | 'OTHER';

export interface RtgsRequestItem {
  id: string;
  approval_code: string;
  payment_mode: 'RTGS' | 'AUTO_DEBIT' | 'EXCEPTIONAL_CASH';
  payee_category: RtgsPayeeCategory;
  beneficiary_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch: string;
  amount: number | string;
  expense_head: string;
  bill_date?: string;
  payment_date?: string;
  bill_number?: string;
  cheque_number?: string;
  narration: string;
  status: RtgsStatus;
  utr_number?: string;
  busy_voucher_no?: string;
  source: string;
  company_account?: string;
  company_bank?: string;
  requested_at: string;
  reviewed_at?: string;
  review_notes?: string;
  requested_by?: string;
  reviewed_by?: string;
  requested_by_name?: string;
  reviewed_by_name?: string;
}

export const rtgsService = {
  getRequests: async (params?: {
    status?: string;
    category?: string;
    expense_head?: string;
    search?: string;
  }): Promise<ApiResponse<RtgsRequestItem[]>> => {
    const res = await api.get<ApiResponse<RtgsRequestItem[]>>('/rtgs/requests', {
      params,
    });
    return res.data;
  },

  createRequest: async (data: Partial<RtgsRequestItem> | Partial<RtgsRequestItem>[]): Promise<ApiResponse<any>> => {
    const res = await api.post<ApiResponse<any>>('/rtgs/requests', data);
    return res.data;
  },

  approveRequest: async (id: string, notes?: string): Promise<ApiResponse<RtgsRequestItem>> => {
    const res = await api.post<ApiResponse<RtgsRequestItem>>(`/rtgs/requests/${id}/approve`, { review_notes: notes });
    return res.data;
  },

  bulkApproveRequests: async (ids: string[], notes?: string): Promise<ApiResponse<{ approved_count: number }>> => {
    const res = await api.post<ApiResponse<{ approved_count: number }>>('/rtgs/requests/bulk-approve', { ids, review_notes: notes });
    return res.data;
  },

  rejectRequest: async (id: string, reason: string): Promise<ApiResponse<RtgsRequestItem>> => {
    const res = await api.post<ApiResponse<RtgsRequestItem>>(`/rtgs/requests/${id}/reject`, { reason });
    return res.data;
  },

  markPaid: async (id: string, utr_number: string): Promise<ApiResponse<RtgsRequestItem>> => {
    const res = await api.post<ApiResponse<RtgsRequestItem>>(`/rtgs/requests/${id}/mark-paid`, { utr_number });
    return res.data;
  },

  deleteRequest: async (id: string): Promise<ApiResponse<void>> => {
    const res = await api.delete<ApiResponse<void>>(`/rtgs/requests/${id}`);
    return res.data;
  },
};
