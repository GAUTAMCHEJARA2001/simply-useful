export type UserRole = 'SALES' | 'ADMIN' | 'HR' | 'INVENTORY' | 'SUPERADMIN';

export interface User {
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
  name?: string;
}

export interface Dealer {
  dealer_code: string;
  dealer_name: string;
  city: string;
  assigned_so_email: string;
  distributor_name: string;
  credit_limit: number;
  outstanding: number;
  active: boolean;
}

export interface Distributor {
  distributor_name: string;
  area: string;
  assigned_so_email: string;
  credit_limit: number;
  outstanding: number;
  active: boolean;
}

export interface Product {
  product_code: string;
  product_name: string;
  category: string;
  category_name?: string;
  bag_size: string;
  rate: number;
  gst: number;
  weight?: number;
  opening_stock?: number;
}

export type OrderStatus = 'Pending' | 'Approved' | 'Dispatched' | 'Completed' | 'Cancelled' | 'Returned';

export interface OrderItem {
  product: string;
  qty: number;
  price: number;
  total: number;
  item_remark: string;
}

export interface Order {
  date: string;
  created_at?: string;
  order_id: string;
  so_email: string;
  party_type: 'Dealer' | 'Distributor';
  party_name: string;
  address?: string;
  contact?: string;
  gst?: string;
  distributor: string;
  items: OrderItem[];
  narration: string;
  status: OrderStatus;
  grand_total: number;
  dispatch_date?: string;
  return_date?: string;
  cancelled_date?: string;
}

export interface Visit {
  date: string;
  so_email: string;
  dealer_name: string;
  remarks: string;
  next_followup: string;
  next_visit_time?: string;
  gps_location?: string;
  photo?: string;
}

export interface Expense {
  id?: number;
  date: string;
  so_email: string;
  category: string;
  amount: number;
  remarks: string;
  status?: string;
  photo?: string;
  reject_reason?: string;
  declaration?: string;
}
