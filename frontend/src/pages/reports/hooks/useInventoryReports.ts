import { useMemo } from 'react';
import { Product } from '@/types';

export interface StockInventoryReport {
  id: string;
  product: string;
  sku: string;
  warehouse: string;
  currentStock: number;
  minStock: number;
  incoming: number;
  outgoing: number;
  status: 'healthy' | 'low' | 'critical';
  costPrice: number;
  rate: number;
  valuation: number;
}

interface UseInventoryReportsParams {
  stockData: any[];
  products: Product[];
  selectedWarehouseNames?: string[];
  selectedProductIds?: string[];
  selectedStockStatuses?: string[];
}

export function useInventoryReports({
  stockData,
  products,
  selectedWarehouseNames = [],
  selectedProductIds = [],
  selectedStockStatuses = []
}: UseInventoryReportsParams): StockInventoryReport[] {
  return useMemo(() => {
    // 1. Map raw API stock items to the enriched reporting schema
    const mapped = stockData.map((s: any, idx: number) => {
      // Backend returns camelCase fields: productName, warehouseName, currentStock, minimumStock
      const prodName = s.productName || s.product_name || s.product?.name || '—';
      const sku = s.sku || s.product?.sku || '—';
      const whName = s.warehouseName || s.warehouse_name || 'Any';
      const currentStock = Math.round(parseFloat(s.currentStock ?? s.current_stock ?? 0));
      const minStock = s.minimumStock ?? s.minimum_stock ?? 50;
      
      // Safety Status: critical (<= 0), low (< minStock), healthy (>= minStock)
      let status: 'healthy' | 'low' | 'critical' = 'healthy';
      if (currentStock <= 0) {
        status = 'critical';
      } else if (currentStock < minStock) {
        status = 'low';
      }

      // Match product rates/costs from DataContext — match by SKU, productName, or productCode
      const matchedProd = products.find(
        p => p.sku === sku || p.productName === prodName || p.productCode === sku
      );
      const costPrice = (matchedProd as any)?.costPrice || (matchedProd?.rate ? matchedProd.rate * 0.7 : 0);
      const rate = matchedProd?.rate || 0;
      const valuation = currentStock * costPrice;

      return {
        id: s.id || `${sku}_${whName}_${idx}`,
        product: prodName,
        sku: sku,
        warehouse: whName,
        currentStock,
        minStock,
        incoming: 0, // reserved/future enhancements
        outgoing: 0,
        status,
        costPrice,
        rate,
        valuation
      } as StockInventoryReport;
    });

    // 2. Apply granular dropdown filters
    let filtered = mapped;
    
    if (selectedWarehouseNames && selectedWarehouseNames.length > 0) {
      const whsLower = selectedWarehouseNames.map(w => w.toLowerCase());
      filtered = filtered.filter(item => 
        whsLower.includes(item.warehouse.toLowerCase())
      );
    }

    if (selectedProductIds && selectedProductIds.length > 0) {
      const prods = selectedProductIds.map(id => products.find(p => p.productCode === id)).filter(Boolean) as Product[];
      const pNamesLower = prods.map(p => (p.productName || p.name || '').toLowerCase());
      const skusLower = prods.map(p => (p.sku || p.productCode || '').toLowerCase());

      filtered = filtered.filter(item => {
        return pNamesLower.some(name => item.product.toLowerCase().includes(name)) || 
               skusLower.includes(item.sku.toLowerCase());
      });
    }

    // 3. Apply stock status multi-select filters
    if (selectedStockStatuses && selectedStockStatuses.length > 0) {
      filtered = filtered.filter(item => selectedStockStatuses.includes(item.status));
    }

    return filtered;
  }, [stockData, products, selectedWarehouseNames, selectedProductIds, selectedStockStatuses]);
}
