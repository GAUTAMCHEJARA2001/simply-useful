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
  { dealerCode: 'DL001', dealerName: 'Sharma Tiles', city: 'Mumbai', assignedSoEmail: 'sales@tileco.com', distributorName: 'West Dist.', creditLimit: 500000, outstanding: 125000, active: true },
  { dealerCode: 'DL002', dealerName: 'Patel Hardware', city: 'Ahmedabad', assignedSoEmail: 'sales@tileco.com', distributorName: 'West Dist.', creditLimit: 300000, outstanding: 50000, active: true },
  { dealerCode: 'DL003', dealerName: 'Singh Building Materials', city: 'Delhi', assignedSoEmail: 'sales@tileco.com', distributorName: 'North Dist.', creditLimit: 400000, outstanding: 380000, active: true },
  { dealerCode: 'DL004', dealerName: 'Reddy Constructions', city: 'Hyderabad', assignedSoEmail: 'sales2@tileco.com', distributorName: 'South Dist.', creditLimit: 600000, outstanding: 200000, active: true },
  { dealerCode: 'DL005', dealerName: 'Gupta Traders', city: 'Pune', assignedSoEmail: 'sales@tileco.com', distributorName: 'West Dist.', creditLimit: 250000, outstanding: 100000, active: false },
];

export const mockDistributors: Distributor[] = [
  { distributorName: 'West Dist.', area: 'Western Region', assignedSoEmail: 'sales@tileco.com', creditLimit: 2000000, outstanding: 500000, active: true },
  { distributorName: 'North Dist.', area: 'Northern Region', assignedSoEmail: 'sales@tileco.com', creditLimit: 1500000, outstanding: 300000, active: true },
  { distributorName: 'South Dist.', area: 'Southern Region', assignedSoEmail: 'sales2@tileco.com', creditLimit: 1800000, outstanding: 700000, active: true },
];

export const mockProducts: Product[] = [
  { productCode: 'TA-001', productName: 'TileFix Standard', category: 'Adhesive', bagSize: '20 KG', rate: 350, gst: 18 },
  { productCode: 'TA-002', productName: 'TileFix Premium', category: 'Adhesive', bagSize: '20 KG', rate: 520, gst: 18 },
  { productCode: 'TA-003', productName: 'TileFix Rapid Set', category: 'Adhesive', bagSize: '25 KG', rate: 680, gst: 18 },
  { productCode: 'TA-004', productName: 'TileFix Waterproof', category: 'Adhesive', bagSize: '20 KG', rate: 750, gst: 18 },
  { productCode: 'TA-005', productName: 'GroutMaster White', category: 'Grout', bagSize: '5 KG', rate: 280, gst: 18 },
  { productCode: 'TA-006', productName: 'GroutMaster Color', category: 'Grout', bagSize: '5 KG', rate: 320, gst: 18 },
  { productCode: 'TA-007', productName: 'TileFix Heavy Duty', category: 'Adhesive', bagSize: '30 KG', rate: 950, gst: 18 },
];

export const mockOrders: Order[] = [
  {
    date: '2026-02-15', orderId: 'ORD-001', soEmail: 'sales@tileco.com',
    partyType: 'Dealer', partyName: 'Sharma Tiles', distributor: 'West Dist.',
    items: [
      { product: 'TileFix Standard', qty: 50, price: 350, total: 17500, itemRemark: '' },
      { product: 'GroutMaster White', qty: 20, price: 280, total: 5600, itemRemark: 'Urgent' },
    ],
    narration: 'Regular monthly order', status: 'Pending', totalAmount: 23100, grandTotal: 23100,
  },
  {
    date: '2026-02-14', orderId: 'ORD-002', soEmail: 'sales@tileco.com',
    partyType: 'Dealer', partyName: 'Patel Hardware', distributor: 'West Dist.',
    items: [
      { product: 'TileFix Premium', qty: 30, price: 520, total: 15600, itemRemark: '' },
    ],
    narration: '', status: 'Approved', totalAmount: 15600, grandTotal: 15600,
  },
  {
    date: '2026-02-10', orderId: 'ORD-003', soEmail: 'sales@tileco.com',
    partyType: 'Distributor', partyName: 'North Dist.', distributor: 'North Dist.',
    items: [
      { product: 'TileFix Heavy Duty', qty: 100, price: 950, total: 95000, itemRemark: 'Project order' },
      { product: 'TileFix Waterproof', qty: 60, price: 750, total: 45000, itemRemark: '' },
    ],
    narration: 'Large project supply', status: 'Completed', totalAmount: 140000, grandTotal: 140000,
  },
  {
    date: '2026-02-12', orderId: 'ORD-004', soEmail: 'sales2@tileco.com',
    partyType: 'Dealer', partyName: 'Reddy Constructions', distributor: 'South Dist.',
    items: [
      { product: 'TileFix Rapid Set', qty: 40, price: 680, total: 27200, itemRemark: '' },
    ],
    narration: 'Express delivery needed', status: 'Dispatched', totalAmount: 27200, grandTotal: 27200,
  },
];
