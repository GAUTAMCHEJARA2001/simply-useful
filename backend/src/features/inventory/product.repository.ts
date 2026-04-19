import prisma from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

/**
 * PRODUCT REPOSITORY (ELITE - SYNCED WITH SCHEMA)
 * Using: productCode, rate, stockQty, gst, etc.
 */

let failureCount = 0;
const BREAKER_THRESHOLD = 5;

const safeQuery = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (failureCount > BREAKER_THRESHOLD) {
    throw new AppError('Inventory service unavailable', 503);
  }

  try {
    const result = await fn();
    failureCount = 0;
    return result;
  } catch (err: any) {
    failureCount++;
    console.error(`📊 PRODUCT DB FAILURE [${failureCount}]:`, err.message);
    throw new AppError('Database operation failed', 500);
  }
};

export const productRepository = {
  findAll: () => safeQuery(() => prisma.product.findMany({
    orderBy: { updatedAt: 'desc' }
  })),

  findById: (id: string) => safeQuery(() => prisma.product.findUnique({
    where: { id }
  })),

  create: (data: any) => safeQuery(() => prisma.product.create({
    data: {
      productCode: data.productCode,
      name: data.name,
      category: data.category || 'General',
      bagSize: data.bagSize || 'N/A',
      rate: data.rate || 0,
      gst: data.gst || 0,
      stockQty: data.stockQty || 0,
      active: true
    }
  })),

  update: (id: string, data: any) => safeQuery(() => prisma.product.update({
    where: { id },
    data
  })),

  delete: (id: string) => safeQuery(() => prisma.product.delete({
    where: { id }
  }))
};
