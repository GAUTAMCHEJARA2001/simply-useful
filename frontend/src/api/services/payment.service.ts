import { api } from '../client';
import { PaymentReceipt } from '../../types';

export const paymentService = {
  getAll: async (): Promise<{ data: PaymentReceipt[] }> => {
    const response = await api.get('/payments');
    return response.data;
  },

  submitPayment: async (formData: FormData) => {
    // Requires multipart/form-data which axios handles automatically with FormData
    const response = await api.post('/payments/upload_receipt', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  verifyPayment: async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    const response = await api.patch(`/payments/${id}/verify`, { status });
    return response.data;
  },
};
