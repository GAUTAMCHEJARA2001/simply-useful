import { describe, it, expect } from 'vitest';
import { adaptOrderToPrintable } from './order.adapter';

describe('order.adapter test', () => {
  it('should override shipping details for PURCHASE ORDER', () => {
    const rawOrder = {
      order_id: 'PO-001',
      party: {
        name: 'DHRUV CHEMICAL',
        address: 'SURAT',
        contact: '9574484719',
        gst: '24CZXJNVASJXNASLKC'
      },
      items: []
    };

    const companyInfo = {
      name: 'KAMLA INDUSTRIES',
      address: 'Phase-1, Industrial Area, Rajasthan, India',
      gst: '08ABCDE1234F1Z5',
      contact: 'Phone: +91 98765 43210 | Email: office@kamlaerl.com',
      phone: '+91 98765 43210'
    };

    const result = adaptOrderToPrintable(rawOrder, companyInfo, 'PURCHASE ORDER');

    expect(result.customer.name).toBe('DHRUV CHEMICAL');
    expect(result.customer.billingAddress).toBe('SURAT');
    
    // Shipping details should be overridden to company details
    expect(result.customer.shippingAddress).toBe('Phase-1, Industrial Area, Rajasthan, India');
    expect(result.customer.shippingName).toBe('KAMLA INDUSTRIES');
    expect(result.customer.shippingMobile).toBe('+91 98765 43210');
    expect(result.customer.shippingGst).toBe('08ABCDE1234F1Z5');
    expect(result.customer.shippingState).toBe('Rajasthan');
    expect(result.customer.shippingStateCode).toBe('08');
  });
});
