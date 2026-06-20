export type UserRole = 'SALES' | 'ADMIN' | 'HR' | 'INVENTORY' | 'SUPERADMIN';

export interface User {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  password?: string;
  territory?: string;
  authorizedWarehouses?: { id: string; name: string }[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Dealer {
  id?: string;
  dealerCode: string;
  dealerName: string;
  city: string;
  state?: string;
  assignedSoEmail: string;
  distributorName: string;
  creditLimit: number;
  outstanding: number;
  active: boolean;
  territory?: string;
  dealer_code?: string;
  dealer_name?: string;
  assigned_so_email?: string;
  distributor_name?: string;
  credit_limit?: number;
  phone?: string;
  email?: string;
  address?: string;
  gst?: string;
  contactPerson?: string;
}

export interface Distributor {
  id?: string;
  distributorName: string;
  area: string;
  assignedSoEmail: string;
  creditLimit: number;
  outstanding: number;
  active: boolean;
  territory?: string;
  distributor_name?: string;
  assigned_so_email?: string;
  credit_limit?: number;
  phone?: string;
  email?: string;
  address?: string;
  gst?: string;
  contactPerson?: string;
}

export interface Product {
  id?: string;
  productCode: string;
  sku?: string;
  product_code?: string;
  name?: string;
  productName?: string;
  product_name?: string;
  category?: string | { id: number | string; name: string } | null;
  categoryId?: string | number;
  categoryName?: string;
  categoryRef?: { id: number | string; name: string } | null;
  bagSize: string;
  bag_size?: string;
  rate: number;
  gst: number;
  weight?: number;
  openingStock?: number;
  minimumStock?: number;
  unit?: string | { id: number | string; name: string } | null;
  unitId?: string | number;
  brand?: { id: number | string; name: string } | null;
  brandId?: number;
  brand_id?: number;
  stockQty?: number;
  availableStock?: number;
  defaultWarehouseId?: string | number | null;
}

export type OrderStatus = 'Pending' | 'Approved' | 'Dispatched' | 'Completed' | 'Cancelled' | 'Returned';

export interface OrderItem {
  product: string;
  productName?: string;
  qty: number;
  price: number;
  total: number;
  itemRemark: string;
  item_remark?: string;
}

export interface Order {
  id?: string;
  date: string;
  createdAt?: string;
  orderId: string;
  soEmail: string;
  partyType: 'Dealer' | 'Distributor';
  partyName: string;
  address?: string;
  contact?: string;
  gst?: string;
  distributor: string;
  items: OrderItem[];
  narration: string;
  status: OrderStatus;
  totalAmount: number;
  grandTotal: number;
  dispatchDate?: string;
  assignedWarehouse?: string | number | null;
  returnDate?: string;
  cancelledDate?: string;
  order_id?: string;
  so_email?: string;
  party_type?: 'Dealer' | 'Distributor';
  party_name?: string;
  grand_total?: number;
  dispatch_date?: string;
  return_date?: string;
  cancelled_date?: string;
}

export interface Visit {
  id?: string;
  date: string;
  soEmail: string;
  dealerName: string;
  remarks: string;
  nextFollowup?: string;
  nextVisitTime?: string;
  gpsLocation?: string;
  photo?: string;
  so_email?: string;
  dealer_name?: string;
  next_followup?: string;
  leadId?: string;
  visitStatus?: string;
  hrRemark?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  visit_status?: string;
  verified_by?: string;
  verified_at?: string;
  hr_remark?: string;
}

export interface Expense {
  id?: string;
  date: string;
  soEmail: string;
  category: string;
  amount: number;
  remarks: string;
  status: string;
  photo?: string;
  rejectReason?: string;
  declaration?: string;
  so_email?: string;
  reject_reason?: string;
}

export interface StockItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  warehouseName: string;
}

export interface KPIs {
  products: number;
  dealers: number;
  revenue: number;
  orders: number;
  totalStockValue: number;
  topProducts?: { name: string; qty: number }[];
  categoryDistribution?: { name: string; value: number; color: string }[];
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  contactInfo?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
  gstNumber?: string;
}

export interface Labour {
  id: string;
  name: string;
  dailyWage: number;
  contactInfo?: string;
}

export interface BOMItem {
  productId: string;
  quantity: number;
}

export interface BOM {
  id: string;
  name: string;
  productId: string;
  productName?: string;
  outputQuantity: number;
  items: BOMItem[];
}

export interface PurchaseItem {
  productId: string;
  quantity: number;
  rate: number;
  taxPercent: number;
  remark?: string;
}

export interface Purchase {
  id: string;
  challanNumber: string;
  supplierId: string;
  supplierName?: string;
  warehouseId: string;
  warehouseName?: string;
  netAmount: number;
  createdAt: string;
  items?: PurchaseItem[];
}

export interface SaleItem {
  productId: string;
  quantity: number;
  sellingRate: number;
  taxPercent: number;
}

export interface Sale {
  id: string;
  challanNumber: string;
  customerId: string;
  customerName?: string;
  warehouseId: string;
  warehouseName?: string;
  netAmount: number;
  createdAt: string;
  items?: SaleItem[];
}

export interface ProductionMaterial {
  productId: string;
  quantityUsed: number;
}

export interface Production {
  id: string;
  finishedProductId: string;
  finishedProductName?: string;
  quantityProduced: number;
  warehouseId: string;
  warehouseName?: string;
  createdAt: string;
  remarks?: string;
  materials?: ProductionMaterial[];
}

export interface Adjustment {
  id: string;
  productId: string;
  productName?: string;
  warehouseId: string;
  warehouseName?: string;
  type: 'Increase' | 'Decrease';
  quantity: number;
  reason?: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  labourId: string;
  labourName?: string;
  date: string;
  status: 'PRESENT' | 'HALF_DAY' | 'ABSENT';
  hours?: number;
  dailyWage?: number;
}

export interface Approval {
  id: string;
  type: string;
  referenceId: string;
  customerName?: string;
  soName?: string;
  grandTotal?: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  data?: any;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  parent_id?: string | null;
}

export interface Unit {
  id: string;
  name: string;
  active?: boolean;
}
