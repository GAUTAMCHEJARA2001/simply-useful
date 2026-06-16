import { PrintableCompany } from '../types/printableInvoice.types';
import { formatPDFDate } from '../utils/dateFormat';

export interface PrintableBOMItem {
  serialNo: number;
  code: string;
  name: string;
  qty: number;
  unit: string;
}

export interface PrintableProductionOrder {
  orderNo: string;
  date: string;
  productName: string;
  targetQty: number;
  unit: string;
  workCenter: string;
  bomItems: PrintableBOMItem[];
  remarks?: string;
  company: PrintableCompany;
  terms: string[];
}

import { getDetailsFromAddressOrGst, cleanGstNumber } from './stateResolver';

/** Normalizes raw production order payloads */
export const adaptProductionToPrintable = (
  rawData: any,
  companyInfo: {
    name: string;
    address: string;
    gst?: string;
    contact: string;
    logo?: string | null;
  }
): PrintableProductionOrder => {
  const cleanCompGst = cleanGstNumber(companyInfo.gst || '08ABCDE1234F1Z5');
  const companyDetails = getDetailsFromAddressOrGst(cleanCompGst, companyInfo.address);

  const company: PrintableCompany = {
    name: companyInfo.name || 'KAMLA INDUSTRIES',
    address: companyInfo.address || 'Phase-1, Industrial Area, Rajasthan, India',
    contact: companyInfo.contact || '',
    gst: cleanCompGst || undefined,
    pan: cleanCompGst && cleanCompGst.length >= 12 ? cleanCompGst.substring(2, 12) : undefined,
    cin: 'L45201RJ2001PLC012345',
    logoUrl: companyInfo.logo || null,
    state: companyDetails.state,
    stateCode: companyDetails.stateCode
  };

  const rawBom = rawData.bom_items || rawData.bomItems || [];
  
  const bomItems: PrintableBOMItem[] = rawBom.map((item: any, idx: number) => {
    return {
      serialNo: idx + 1,
      code: String(item.code || '—'),
      name: String(item.name || 'Unknown Material'),
      qty: Number(item.qty || item.quantity || 0),
      unit: String(item.unit || 'Kg')
    };
  });

  return {
    orderNo: String(rawData.order_no || rawData.order_id || 'N/A'),
    date: formatPDFDate(rawData.date || new Date()),
    productName: String(rawData.product_name || rawData.productName || 'Cement Batch'),
    targetQty: Number(rawData.target_qty || rawData.targetQty || 0),
    unit: String(rawData.unit || 'Bags'),
    workCenter: String(rawData.work_center || rawData.workCenter || 'Main Plant'),
    bomItems,
    remarks: rawData.remarks || rawData.remark || undefined,
    company,
    terms: [
      '1. Verify raw material moisture levels before starting the mixing process.',
      '2. Document batch number and operator identity on work logs.',
      '3. Floor supervisors must sign off on finished batch quality inspect reports.'
    ]
  };
};
