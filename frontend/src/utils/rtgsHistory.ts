/**
 * RTGS / NEFT Generation History & Audit Log
 * Stores all generated RTGS forms (single or bulk) locally and provides re-download capabilities.
 */

export interface RtgsHistoryRecord {
  id: string;
  createdAt: string;       // ISO timestamp
  date: string;            // Form date YYYY-MM-DD
  beneficiaryName: string;
  category: 'SUPPLIER' | 'EMPLOYEE' | 'SALARY' | 'OTHER';
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch?: string;
  amount: number;
  narration: string;
  chequeNumber?: string;
  source: 'HUB_SINGLE' | 'HUB_BULK' | 'PAYROLL_SINGLE' | 'PAYROLL_BULK' | 'SLIPS_MODAL';
  companyAccount?: string;
  companyBank?: string;
}

const HISTORY_STORAGE_KEY = 'simply_rtgs_history_records_v1';
const MAX_HISTORY_RECORDS = 500;

export const getRtgsHistory = (): RtgsHistoryRecord[] => {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse RTGS history:', e);
    return [];
  }
};

export const saveRtgsRecord = (record: Omit<RtgsHistoryRecord, 'id' | 'createdAt'>): RtgsHistoryRecord => {
  const existing = getRtgsHistory();
  const newRecord: RtgsHistoryRecord = {
    ...record,
    id: `rtgs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  const updated = [newRecord, ...existing].slice(0, MAX_HISTORY_RECORDS);
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to persist RTGS record to localStorage:', e);
  }
  return newRecord;
};

export const saveBulkRtgsRecords = (
  records: Array<Omit<RtgsHistoryRecord, 'id' | 'createdAt'>>
): RtgsHistoryRecord[] => {
  const existing = getRtgsHistory();
  const now = new Date().toISOString();
  const newRecords: RtgsHistoryRecord[] = records.map((r, idx) => ({
    ...r,
    id: `rtgs_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
  }));

  const updated = [...newRecords, ...existing].slice(0, MAX_HISTORY_RECORDS);
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to persist bulk RTGS records to localStorage:', e);
  }
  return newRecords;
};

export const deleteRtgsRecord = (id: string): RtgsHistoryRecord[] => {
  const existing = getRtgsHistory();
  const updated = existing.filter(r => r.id !== id);
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update RTGS records:', e);
  }
  return updated;
};

export const clearRtgsHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear RTGS history:', e);
  }
};

