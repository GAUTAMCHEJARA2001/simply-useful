import { useMemo } from 'react';
import { Order, Dealer, Distributor } from '@/types';

export interface PartnerReportRow {
  id: string;
  name: string;
  type: 'Dealer' | 'Distributor';
  city: string;
  state: string;
  totalOrders: number;
  totalAmount: number;
  lastOrderDate: string;
}

interface UsePartnerReportsParams {
  orders: Order[];
  dealers: Dealer[];
  distributors: Distributor[];
  startDate: Date;
  endDate: Date;
  partnerTypeFilter: 'all' | 'dealer' | 'distributor';
  selectedState: string;
  selectedPartnerName: string;
}

export function usePartnerReports({
  orders,
  dealers,
  distributors,
  startDate,
  endDate,
  partnerTypeFilter,
  selectedState,
  selectedPartnerName
}: UsePartnerReportsParams): PartnerReportRow[] {
  return useMemo(() => {
    const list: PartnerReportRow[] = [];

    // 1. Gather Dealers
    if (partnerTypeFilter === 'all' || partnerTypeFilter === 'dealer') {
      dealers.forEach((d, idx) => {
        list.push({
          id: d.dealerCode || `dlr_${idx}`,
          name: d.dealerName || 'Unknown Dealer',
          type: 'Dealer',
          city: d.city || '—',
          state: d.state || '—',
          totalOrders: 0,
          totalAmount: 0,
          lastOrderDate: '—'
        });
      });
    }

    // 2. Gather Distributors
    if (partnerTypeFilter === 'all' || partnerTypeFilter === 'distributor') {
      distributors.forEach((d, idx) => {
        list.push({
          id: d.id || `dist_${idx}`,
          name: d.distributorName || 'Unknown Distributor',
          type: 'Distributor',
          city: (d as any).city || '—',
          state: (d as any).state || (d as any).area || '—',
          totalOrders: 0,
          totalAmount: 0,
          lastOrderDate: '—'
        });
      });
    }

    // Fallback: If list is empty, scan orders for new partner names
    if (list.length === 0) {
      const partnersFromOrders = new Set<string>(orders.map(o => o.partyName).filter(Boolean) as string[]);
      partnersFromOrders.forEach((name, idx) => {
        list.push({
          id: `ord_partner_${idx}`,
          name,
          type: 'Dealer', // Default guess
          city: '—',
          state: '—',
          totalOrders: 0,
          totalAmount: 0,
          lastOrderDate: '—'
        });
      });
    }

    // 3. Populate transaction aggregations within date range
    const updated = list.map(partner => {
      // Find orders matching this partner's name within dates
      const partnerOrders = orders.filter(o => {
        const pName = o.partyName || (o as any).party_name;
        if (!pName || pName.toLowerCase() !== partner.name.toLowerCase()) return false;
        const oDate = new Date(o.date || (o as any).createdAt);
        return oDate >= startDate && oDate <= endDate;
      });

      const completedOrders = partnerOrders.filter(o => o.status === 'Completed' || o.status === 'Approved');
      const totalAmount = completedOrders.reduce((sum, o) => sum + (o.grandTotal || o.grand_total || 0), 0);

      let lastOrderStr = '—';
      if (partnerOrders.length > 0) {
        // Sort to find the latest order date
        const sorted = [...partnerOrders].sort((a, b) => {
          const ad = new Date(a.date || (a as any).createdAt).getTime();
          const bd = new Date(b.date || (b as any).createdAt).getTime();
          return bd - ad;
        });
        const latest = sorted[0];
        const dateRaw = latest.date || (latest as any).createdAt;
        if (dateRaw) {
          lastOrderStr = typeof dateRaw === 'string' ? dateRaw.substring(0, 10) : new Date(dateRaw).toISOString().substring(0, 10);
        }
      }

      return {
        ...partner,
        totalOrders: partnerOrders.length,
        totalAmount,
        lastOrderDate: lastOrderStr
      };
    });

    // 4. Apply filter panel options
    let filtered = updated;

    if (selectedState && selectedState !== 'all') {
      filtered = filtered.filter(item => 
        item.state.toLowerCase() === selectedState.toLowerCase()
      );
    }

    if (selectedPartnerName && selectedPartnerName !== 'all') {
      filtered = filtered.filter(item => 
        item.name.toLowerCase() === selectedPartnerName.toLowerCase()
      );
    }

    return filtered;
  }, [orders, dealers, distributors, startDate, endDate, partnerTypeFilter, selectedState, selectedPartnerName]);
}
