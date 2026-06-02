import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['SALES', 'ADMIN', 'HR', 'INVENTORY', 'SUPERADMIN']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const OrderStatusSchema = z.enum(['Pending', 'Approved', 'Dispatched', 'Completed', 'Cancelled', 'Returned']);

export const productSchema = z.object({
  productCode: z.string().min(2),
  name: z.string().min(2),
  category: z.string().optional(),
  bagSize: z.string().optional(),
  rate: z.number().positive(),
  gst: z.number().min(0).max(100),
  stockQty: z.number().int().min(0),
});

export const saleItemSchema = z.object({
  productId: z.string(),
  qty: z.number().int().positive(),
  price: z.number().positive(),
  total: z.number().positive(),
  itemRemark: z.string().optional(),
});

export const createSaleSchema = z.object({
  partyType: z.string(),
  partyName: z.string(),
  distributor: z.string().optional(),
  warehouseId: z.number().int().positive(), // Added for multi-warehouse support
  items: z.array(saleItemSchema).nonempty(),
  narration: z.string().optional(),
  grandTotal: z.number().positive(),
});

export const dealerSchema = z.object({
  dealerCode: z.string().min(2),
  dealerName: z.string().min(2),
  city: z.string(),
  assignedSoEmail: z.string().email(),
  distributorName: z.string(),
  creditLimit: z.number().min(0).optional(),
});

export const visitSchema = z.object({
  soEmail: z.string().email(),
  dealerName: z.string(),
  remarks: z.string(),
  nextFollowup: z.string().datetime().optional(),
  nextVisitTime: z.string().datetime().optional(),
  gpsLocation: z.string().optional(),
});

export const expenseSchema = z.object({
  soEmail: z.string().email(),
  category: z.string(),
  amount: z.number().positive(),
  remarks: z.string(),
  photo: z.string().optional(),
  declaration: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type SaleItemInput = z.infer<typeof saleItemSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type DealerInput = z.infer<typeof dealerSchema>;
export type VisitInput = z.infer<typeof visitSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
