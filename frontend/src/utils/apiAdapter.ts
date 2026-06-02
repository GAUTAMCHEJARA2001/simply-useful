/**
 * Frontend API Adapter / Mapping Layer
 * 
 * This layer decouples the React UI from the raw backend schema.
 * All API responses should pass through these mappers.
 */

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  unit: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

/**
 * Maps raw backend inventory data to UI-friendly structure
 */
export const mapInventoryItem = (data: any): InventoryItem => {
  return {
    id: data.id || data.product_id || '',
    name: data.name || data.product_name || 'Unknown Product',
    sku: data.sku || 'N/A',
    category: data.category || data.category_name || 'Uncategorized',
    stock: Number(data.totalStock || data.total_stock || 0),
    unit: data.unit || 'pcs'
  };
};

/**
 * Maps warehouse data
 */
export const mapWarehouse = (data: any): Warehouse => {
  return {
    id: data.id || data.warehouse_id || '',
    name: data.name || data.warehouse_name || 'Main Warehouse',
    location: data.location || ''
  };
};

/**
 * Generic response mapper for the Standard API Response Structure
 * { status: 'success', data: [...] }
 */
export const handleApiResponse = <T>(response: any, mapper: (item: any) => T): T[] => {
  if (response.status === 'success' && Array.isArray(response.data)) {
    return response.data.map(mapper);
  }
  if (Array.isArray(response)) {
    return response.map(mapper);
  }
  return [];
};
