import { useMemo } from 'react';
import { Order, Product, Dealer, Distributor } from '@/types';

// ─── Row shapes per sub-view ───────────────────────────────────────────────

export interface BrandSalesRow {
  id: string;
  brand: string;
  revenue: number;
  qty: number;
  avgPrice: number;
  ordersCount: number;
}

export interface ItemSalesRow {
  id: string;
  product: string;
  sku: string;
  category: string;
  brand: string;
  revenue: number;
  qty: number;
  avgPrice: number;
  ordersCount: number;
}

export interface CounterSalesRow {
  id: string;
  name: string;
  type: 'Dealer' | 'Distributor' | 'Other';
  city: string;
  state: string;
  revenue: number;
  ordersCount: number;
  avgOrder: number;
}

export interface AreaSalesRow {
  id: string;
  state: string;
  city: string;
  revenue: number;
  ordersCount: number;
  partners: number; // unique counter names
}

export interface CategorySalesRow {
  id: string;
  category: string;
  revenue: number;
  qty: number;
  ordersCount: number;
  sharePercent: number;
}

export interface HeatCell {
  day: number;   // 0=Sun … 6=Sat
  hour: number;  // 0-23
  count: number;
  revenue: number;
}

export type SalesSubView = 'brand' | 'item' | 'counter' | 'area' | 'heatmap' | 'category';

export type SalesAnalysisRow =
  | BrandSalesRow
  | ItemSalesRow
  | CounterSalesRow
  | AreaSalesRow
  | CategorySalesRow;

interface UseSalesAnalysisParams {
  orders: Order[];
  products: Product[];
  dealers: Dealer[];
  distributors: Distributor[];
  startDate: Date;
  endDate: Date;
  activeSalesView: SalesSubView;
  selectedBrands?: string[];
  selectedTerritories?: string[];
  selectedProducts?: string[];
  selectedPartners?: string[];
}

interface SalesAnalysisResult {
  rows: SalesAnalysisRow[];
  heatMap: HeatCell[];
  totalRevenue: number;
}

// Helper: resolve brand name from product
function getBrand(p: Product | undefined): string {
  if (!p) return 'No Brand';
  if (typeof p.brand === 'object' && p.brand !== null) return p.brand.name || 'No Brand';
  return 'No Brand';
}

// Helper: resolve category name from product
function getCategory(p: Product | undefined): string {
  if (!p) return 'Uncategorised';
  if (p.categoryName) return p.categoryName;
  if (p.categoryRef && typeof p.categoryRef === 'object') return p.categoryRef.name || 'Uncategorised';
  if (typeof p.category === 'object' && p.category !== null) return (p.category as any).name || 'Uncategorised';
  if (typeof p.category === 'string' && p.category) return p.category;
  return 'Uncategorised';
}

export function useSalesAnalysis({
  orders,
  products,
  dealers,
  distributors,
  startDate,
  endDate,
  activeSalesView,
  selectedBrands = [],
  selectedTerritories = [],
  selectedProducts = [],
  selectedPartners = [],
}: UseSalesAnalysisParams): SalesAnalysisResult {
  return useMemo(() => {
    // Build quick product lookup map
    const productMap = new Map<string, Product>();
    products.forEach(p => {
      const key = (p.productName || p.name || '').toLowerCase();
      const code = (p.productCode || p.product_code || '').toLowerCase();
      if (key) productMap.set(key, p);
      if (code) productMap.set(code, p);
    });

    // Build dealer lookup: name → {city, state, type, territory}
    const dealerMap = new Map<string, { city: string; state: string; type: 'Dealer' | 'Distributor'; territory: string }>();
    dealers.forEach(d => {
      const name = (d.dealerName || d.dealer_name || '').toLowerCase();
      if (name) dealerMap.set(name, {
        city: (d as any).city || '—',
        state: (d as any).state || '—',
        type: 'Dealer',
        territory: d.territory || ''
      });
    });
    distributors.forEach(d => {
      const name = (d.distributorName || d.distributor_name || '').toLowerCase();
      if (name) dealerMap.set(name, {
        city: (d as any).city || '—',
        state: (d as any).area || (d as any).state || '—',
        type: 'Distributor',
        territory: d.territory || ''
      });
    });

    // 1. Filter orders to date range with Completed/Approved status
    let inRange = orders.filter(o => {
      const d = new Date(o.date || (o as any).createdAt);
      return d >= startDate && d <= endDate;
    });

    // 1b. Filter by territory if applicable
    if (selectedTerritories && selectedTerritories.length > 0) {
      inRange = inRange.filter(o => {
        const name = (o.partyName || (o as any).party_name || '').toLowerCase();
        const partyInfo = dealerMap.get(name);
        return partyInfo?.territory && selectedTerritories.includes(partyInfo.territory);
      });
    }

    // 1c. Filter by brand if applicable
    if (selectedBrands && selectedBrands.length > 0) {
      const brandsLower = selectedBrands.map(b => b.toLowerCase());
      inRange = inRange.map(o => {
        const filteredItems = (o.items || []).filter((item: any) => {
          const rawName = getItemName(item);
          const prod = resolveProduct(rawName);
          const brand = getBrand(prod);
          return brandsLower.includes(brand.toLowerCase());
        });
        return {
          ...o,
          items: filteredItems,
          grandTotal: filteredItems.reduce((sum, item) => sum + (Number(item.total) || (Number(item.qty) * Number(item.price)) || 0), 0),
          grand_total: filteredItems.reduce((sum, item) => sum + (Number(item.total) || (Number(item.qty) * Number(item.price)) || 0), 0),
        };
      }).filter(o => o.items.length > 0);
    }

    // 1d. Filter by specific product if applicable (Item-wise custom option)
    if (selectedProducts && selectedProducts.length > 0) {
      const prodsLower = selectedProducts.map(p => p.toLowerCase());
      inRange = inRange.map(o => {
        const filteredItems = (o.items || []).filter((item: any) => {
          const rawName = getItemName(item);
          const prod = resolveProduct(rawName);
          const pCode = (prod?.productCode || prod?.product_code || '').toLowerCase();
          return prodsLower.includes(pCode) || prodsLower.includes(rawName.toLowerCase());
        });
        return {
          ...o,
          items: filteredItems,
          grandTotal: filteredItems.reduce((sum, item) => sum + (Number(item.total) || (Number(item.qty) * Number(item.price)) || 0), 0),
          grand_total: filteredItems.reduce((sum, item) => sum + (Number(item.total) || (Number(item.qty) * Number(item.price)) || 0), 0),
        };
      }).filter(o => o.items.length > 0);
    }

    // 1e. Filter by specific partner if applicable (Counter-wise custom option)
    if (selectedPartners && selectedPartners.length > 0) {
      const partnersLower = selectedPartners.map(p => p.toLowerCase());
      inRange = inRange.filter(o => {
        const name = o.partyName || (o as any).party_name || '';
        return partnersLower.includes(name.toLowerCase());
      });
    }

    // Resolve product from order item — safely handles objects, numbers, null, undefined
    function resolveProduct(rawValue: unknown): Product | undefined {
      let name = '';
      if (typeof rawValue === 'string') {
        name = rawValue;
      } else if (rawValue && typeof rawValue === 'object') {
        // item.product might be a full Product object from the serialiser
        const obj = rawValue as Record<string, unknown>;
        name = String(obj.name || obj.productName || obj.product_name || obj.productCode || '');
      } else if (rawValue != null) {
        name = String(rawValue);
      }
      if (!name) return undefined;
      return productMap.get(name.toLowerCase());
    }

    // Safely extract a human-readable product name string from an order item
    function getItemName(item: any): string {
      const raw = item.productName ?? item.product ?? item.name ?? '';
      if (typeof raw === 'string') return raw;
      if (raw && typeof raw === 'object') {
        const o = raw as Record<string, unknown>;
        return String(o.name || o.productName || o.product_name || '');
      }
      return String(raw || '');
    }

    const totalRevenue = inRange.reduce(
      (s, o) => s + (o.grandTotal || (o as any).grand_total || 0),
      0
    );

    // ─── Heat Map (always computed, not filtered by sub-view) ───────────────
    const heatGrid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
    const heatRevGrid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
    inRange.forEach(o => {
      const d = new Date(o.date || (o as any).createdAt);
      const day = d.getDay();   // 0=Sun
      const hour = d.getHours();
      heatGrid[day][hour] += 1;
      heatRevGrid[day][hour] += (o.grandTotal || (o as any).grand_total || 0);
    });
    const heatMap: HeatCell[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        heatMap.push({ day, hour, count: heatGrid[day][hour], revenue: heatRevGrid[day][hour] });
      }
    }

    if (activeSalesView === 'heatmap') {
      return { rows: [], heatMap, totalRevenue };
    }

    // ─── Brand-wise ────────────────────────────────────────────────────────
    if (activeSalesView === 'brand') {
      const brandMap = new Map<string, { revenue: number; qty: number; ordersCount: Set<string> }>();
      inRange.forEach(o => {
        const oId = o.orderId || o.id || '';
        (o.items || []).forEach((item: any) => {
          const rawName = getItemName(item);
          const prod = resolveProduct(rawName);
          const brand = getBrand(prod);
          if (!brandMap.has(brand)) brandMap.set(brand, { revenue: 0, qty: 0, ordersCount: new Set() });
          const entry = brandMap.get(brand)!;
          entry.revenue += Number(item.total) || (Number(item.qty) * Number(item.price)) || 0;
          entry.qty += Number(item.qty) || 0;
          entry.ordersCount.add(oId);
        });
      });

      const rows: BrandSalesRow[] = Array.from(brandMap.entries()).map(([brand, data]) => ({
        id: brand,
        brand,
        revenue: data.revenue,
        qty: data.qty,
        avgPrice: data.qty > 0 ? data.revenue / data.qty : 0,
        ordersCount: data.ordersCount.size,
      }));

      return { rows, heatMap, totalRevenue };
    }

    // ─── Item-wise ─────────────────────────────────────────────────────────
    if (activeSalesView === 'item') {
      const itemMap = new Map<string, {
        productName: string; sku: string; category: string; brand: string;
        revenue: number; qty: number; ordersCount: Set<string>;
      }>();

      inRange.forEach(o => {
        const oId = o.orderId || o.id || '';
        (o.items || []).forEach((item: any) => {
          const rawName = getItemName(item);
          const prod = resolveProduct(rawName);
          const sku = prod?.productCode || prod?.sku || prod?.product_code || rawName || 'Unknown';
          const category = getCategory(prod);
          const brand = getBrand(prod);
          const displayName = prod?.productName || prod?.name || rawName || 'Unknown';

          if (!itemMap.has(sku)) {
            itemMap.set(sku, {
              productName: displayName,
              sku,
              category,
              brand,
              revenue: 0,
              qty: 0,
              ordersCount: new Set()
            });
          }
          const entry = itemMap.get(sku)!;
          entry.revenue += Number(item.total) || (Number(item.qty) * Number(item.price)) || 0;
          entry.qty += Number(item.qty) || 0;
          entry.ordersCount.add(oId);
        });
      });

      let rows: ItemSalesRow[] = Array.from(itemMap.entries()).map(([sku, data]) => ({
        id: sku,
        product: data.productName,
        sku: data.sku,
        category: data.category,
        brand: data.brand,
        revenue: data.revenue,
        qty: data.qty,
        avgPrice: data.qty > 0 ? data.revenue / data.qty : 0,
        ordersCount: data.ordersCount.size,
      }));

      // No extra item-wise category filtering needed as brand filtering is done at source inRange

      return { rows, heatMap, totalRevenue };
    }

    // ─── Counter-wise ──────────────────────────────────────────────────────
    if (activeSalesView === 'counter') {
      const counterMap = new Map<string, {
        type: 'Dealer' | 'Distributor' | 'Other';
        city: string; state: string;
        revenue: number; ordersCount: number;
      }>();

      inRange.forEach(o => {
        const name = o.partyName || (o as any).party_name || 'Unknown';
        const dealer = dealerMap.get(name.toLowerCase());
        if (!counterMap.has(name)) {
          counterMap.set(name, {
            type: dealer?.type || (o.partyType as any) || 'Other',
            city: dealer?.city || '—',
            state: dealer?.state || '—',
            revenue: 0,
            ordersCount: 0,
          });
        }
        const entry = counterMap.get(name)!;
        entry.revenue += o.grandTotal || (o as any).grand_total || 0;
        entry.ordersCount += 1;
      });

      const rows: CounterSalesRow[] = Array.from(counterMap.entries()).map(([name, data]) => ({
        id: name,
        name,
        type: data.type,
        city: data.city,
        state: data.state,
        revenue: data.revenue,
        ordersCount: data.ordersCount,
        avgOrder: data.ordersCount > 0 ? data.revenue / data.ordersCount : 0,
      }));

      return { rows, heatMap, totalRevenue };
    }

    // ─── Area-wise ─────────────────────────────────────────────────────────
    if (activeSalesView === 'area') {
      const areaMap = new Map<string, {
        state: string; city: string;
        revenue: number; ordersCount: number; partnerSet: Set<string>;
      }>();

      inRange.forEach(o => {
        const name = o.partyName || (o as any).party_name || '';
        const dealer = dealerMap.get(name.toLowerCase());
        const state = dealer?.state || '—';
        const city = dealer?.city || '—';
        const areaKey = `${state}__${city}`;

        if (!areaMap.has(areaKey)) {
          areaMap.set(areaKey, { state, city, revenue: 0, ordersCount: 0, partnerSet: new Set() });
        }
        const entry = areaMap.get(areaKey)!;
        entry.revenue += o.grandTotal || (o as any).grand_total || 0;
        entry.ordersCount += 1;
        if (name) entry.partnerSet.add(name);
      });

      const rows: AreaSalesRow[] = Array.from(areaMap.entries()).map(([key, data]) => ({
        id: key,
        state: data.state,
        city: data.city,
        revenue: data.revenue,
        ordersCount: data.ordersCount,
        partners: data.partnerSet.size,
      }));

      return { rows, heatMap, totalRevenue };
    }

    // ─── Category-wise ─────────────────────────────────────────────────────
    // activeSalesView === 'category'
    const catMap = new Map<string, { revenue: number; qty: number; ordersCount: Set<string> }>();
    inRange.forEach(o => {
      const oId = o.orderId || o.id || '';
      (o.items || []).forEach((item: any) => {
        const rawName = getItemName(item);
        const prod = resolveProduct(rawName);
        const cat = getCategory(prod);
        if (!catMap.has(cat)) catMap.set(cat, { revenue: 0, qty: 0, ordersCount: new Set() });
        const entry = catMap.get(cat)!;
        entry.revenue += Number(item.total) || (Number(item.qty) * Number(item.price)) || 0;
        entry.qty += Number(item.qty) || 0;
        entry.ordersCount.add(oId);
      });
    });

    const catTotalRevenue = Array.from(catMap.values()).reduce((s, d) => s + d.revenue, 0);

    const rows: CategorySalesRow[] = Array.from(catMap.entries()).map(([category, data]) => ({
      id: category,
      category,
      revenue: data.revenue,
      qty: data.qty,
      ordersCount: data.ordersCount.size,
      sharePercent: catTotalRevenue > 0 ? Number(((data.revenue / catTotalRevenue) * 100).toFixed(1)) : 0,
    }));

    return { rows, heatMap, totalRevenue };
  }, [orders, products, dealers, distributors, startDate, endDate, activeSalesView, selectedBrands, selectedTerritories, selectedProducts, selectedPartners]);
}
