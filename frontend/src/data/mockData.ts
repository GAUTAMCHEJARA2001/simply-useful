import { User, Dealer, Distributor, Product, Order } from '@/types';

export const mockUsers: User[] = [
  { email: 'sales@tileco.com', password: 'sales123', role: 'SALES', active: true, name: 'Rajesh Kumar' },
  { email: 'admin@tileco.com', password: 'admin123', role: 'ADMIN', active: true, name: 'Priya Sharma' },
  { email: 'hr@tileco.com', password: 'hr123', role: 'HR', active: true, name: 'Amit Patel' },
  { email: 'inventory@tileco.com', password: 'inv123', role: 'INVENTORY', active: true, name: 'Suresh Gupta' },
  { email: 'super@tileco.com', password: 'super123', role: 'SUPERADMIN', active: true, name: 'Vikram Singh' },
  { email: 'sales2@tileco.com', password: 'sales123', role: 'SALES', active: true, name: 'Neha Verma' },
];

export const mockDealers: Dealer[] = [
  { dealer_code: 'DL001', dealer_name: 'Sharma Tiles', city: 'Mumbai', assigned_so_email: 'sales@tileco.com', distributor_name: 'West Dist.', credit_limit: 500000, outstanding: 125000, active: true },
  { dealer_code: 'DL002', dealer_name: 'Patel Hardware', city: 'Ahmedabad', assigned_so_email: 'sales@tileco.com', distributor_name: 'West Dist.', credit_limit: 300000, outstanding: 50000, active: true },
  { dealer_code: 'DL003', dealer_name: 'Singh Building Materials', city: 'Delhi', assigned_so_email: 'sales@tileco.com', distributor_name: 'North Dist.', credit_limit: 400000, outstanding: 380000, active: true },
  { dealer_code: 'DL004', dealer_name: 'Reddy Constructions', city: 'Hyderabad', assigned_so_email: 'sales2@tileco.com', distributor_name: 'South Dist.', credit_limit: 600000, outstanding: 200000, active: true },
  { dealer_code: 'DL005', dealer_name: 'Gupta Traders', city: 'Pune', assigned_so_email: 'sales@tileco.com', distributor_name: 'West Dist.', credit_limit: 250000, outstanding: 100000, active: false },
];

export const mockDistributors: Distributor[] = [
  { distributor_name: 'West Dist.', area: 'Western Region', assigned_so_email: 'sales@tileco.com', credit_limit: 2000000, outstanding: 500000, active: true },
  { distributor_name: 'North Dist.', area: 'Northern Region', assigned_so_email: 'sales@tileco.com', credit_limit: 1500000, outstanding: 300000, active: true },
  { distributor_name: 'South Dist.', area: 'Southern Region', assigned_so_email: 'sales2@tileco.com', credit_limit: 1800000, outstanding: 700000, active: true },
];

export const mockProducts: Product[] = [
  { product_code: 'TA-001', product_name: 'TileFix Standard', category: 'Adhesive', bag_size: '20 KG', rate: 350, gst: 18 },
  { product_code: 'TA-002', product_name: 'TileFix Premium', category: 'Adhesive', bag_size: '20 KG', rate: 520, gst: 18 },
  { product_code: 'TA-003', product_name: 'TileFix Rapid Set', category: 'Adhesive', bag_size: '25 KG', rate: 680, gst: 18 },
  { product_code: 'TA-004', product_name: 'TileFix Waterproof', category: 'Adhesive', bag_size: '20 KG', rate: 750, gst: 18 },
  { product_code: 'TA-005', product_name: 'GroutMaster White', category: 'Grout', bag_size: '5 KG', rate: 280, gst: 18 },
  { product_code: 'TA-006', product_name: 'GroutMaster Color', category: 'Grout', bag_size: '5 KG', rate: 320, gst: 18 },
  { product_code: 'TA-007', product_name: 'TileFix Heavy Duty', category: 'Adhesive', bag_size: '30 KG', rate: 950, gst: 18 },
];

export const mockOrders: Order[] = [
  {
    date: '2026-02-15', order_id: 'ORD-001', so_email: 'sales@tileco.com',
    party_type: 'Dealer', party_name: 'Sharma Tiles', distributor: 'West Dist.',
    items: [
      { product: 'TileFix Standard', qty: 50, price: 350, total: 17500, item_remark: '' },
      { product: 'GroutMaster White', qty: 20, price: 280, total: 5600, item_remark: 'Urgent' },
    ],
    narration: 'Regular monthly order', status: 'Pending', grand_total: 23100,
  },
  {
    date: '2026-02-14', order_id: 'ORD-002', so_email: 'sales@tileco.com',
    party_type: 'Dealer', party_name: 'Patel Hardware', distributor: 'West Dist.',
    items: [
      { product: 'TileFix Premium', qty: 30, price: 520, total: 15600, item_remark: '' },
    ],
    narration: '', status: 'Approved', grand_total: 15600,
  },
  {
    date: '2026-02-10', order_id: 'ORD-003', so_email: 'sales@tileco.com',
    party_type: 'Distributor', party_name: 'North Dist.', distributor: 'North Dist.',
    items: [
      { product: 'TileFix Heavy Duty', qty: 100, price: 950, total: 95000, item_remark: 'Project order' },
      { product: 'TileFix Waterproof', qty: 60, price: 750, total: 45000, item_remark: '' },
    ],
    narration: 'Large project supply', status: 'Completed', grand_total: 140000,
  },
  {
    date: '2026-02-12', order_id: 'ORD-004', so_email: 'sales2@tileco.com',
    party_type: 'Dealer', party_name: 'Reddy Constructions', distributor: 'South Dist.',
    items: [
      { product: 'TileFix Rapid Set', qty: 40, price: 680, total: 27200, item_remark: '' },
    ],
    narration: 'Express delivery needed', status: 'Dispatched', grand_total: 27200,
  },
];
