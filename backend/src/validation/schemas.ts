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
  items: z.array(saleItemSchema).nonempty(),
  narration: z.string().optional(),
  grandTotal: z.number().positive(),
});
