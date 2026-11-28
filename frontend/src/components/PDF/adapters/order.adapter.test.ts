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

  it('should calculate product-wise GST (5%, 0%, and nested product.gst) instead of hardcoding 18%', () => {
    const rawOrder = {
      order_id: 'ORD-005',
      party: {
        name: 'Test Dealer',
        gst: '24AAAAA0000A1Z5',
      },
      items: [
        { productName: 'Item 5%', qty: 2, rate: 1000, tax_percent: 5 },
        { productName: 'Item 0%', qty: 1, rate: 500, tax_percent: 0 },
        { productName: 'Item Product GST 12%', qty: 1, rate: 1000, product: { gst: 12 } },
      ],
    };
    const companyInfo = {
      name: 'KAMLA',
      gst: '24BBBBB0000B1Z6',
    };

    const result = adaptOrderToPrintable(rawOrder, companyInfo, 'SALES ORDER');
    expect(result.items[0].taxPercent).toBe(5);
    expect(result.items[0].taxAmount).toBe(100);
    expect(result.items[0].total).toBe(2100);

    expect(result.items[1].taxPercent).toBe(0);
    expect(result.items[1].taxAmount).toBe(0);
    expect(result.items[1].total).toBe(500);

    expect(result.items[2].taxPercent).toBe(12);
    expect(result.items[2].taxAmount).toBe(120);
    expect(result.items[2].total).toBe(1120);

    expect(result.totals.taxAmount).toBe(220);
    expect(result.totals.grandTotal).toBe(3720);
  });

  it('should group and sum items with the same GST rate into separate tax summary rows', () => {
    const rawOrder = {
      order_id: 'ORD-MULTI',
      party: { name: 'Test', gst: '24AAAAA0000A1Z5' },
      items: [
        { productName: 'A (5%)', qty: 2, rate: 500, tax_percent: 5 },
        { productName: 'B (5%)', qty: 1, rate: 1000, tax_percent: 5 },
        { productName: 'C (12%)', qty: 1, rate: 1000, tax_percent: 12 },
        { productName: 'D (12%)', qty: 2, rate: 500, tax_percent: 12 },
      ],
    };
    const result = adaptOrderToPrintable(rawOrder, { name: 'Co', gst: '27BBBBB0000B1Z6' }, 'SALES ORDER');
    expect(result.taxes).toHaveLength(2);
    const gst5 = result.taxes.find(t => t.taxPercent === 5);
    const gst12 = result.taxes.find(t => t.taxPercent === 12);
    expect(gst5?.taxableValue).toBe(2000);
    expect(gst5?.igstAmount).toBe(100);
    expect(gst12?.taxableValue).toBe(2000);
    expect(gst12?.igstAmount).toBe(240);
    expect(result.totals.taxAmount).toBe(340);
    expect(result.totals.grandTotal).toBe(4340);
  });
});
