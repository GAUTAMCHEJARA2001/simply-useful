import { api } from '../client';
import { PaymentReceipt } from '../../types';

export const paymentService = {
  getAll: async () => {
    const response = await api.get('/payments');
    const data = response.data;
    return data.results || data.data || data || [];
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
