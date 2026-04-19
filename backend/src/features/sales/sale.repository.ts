import prisma from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

/**
 * SALES REPOSITORY (ELITE)
 */

let failureCount = 0;
const BREAKER_THRESHOLD = 5;

const safeQuery = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (failureCount > BREAKER_THRESHOLD) {
    throw new AppError('Sales service temporarily unavailable', 503);
  }

  try {
    const result = await fn();
    failureCount = 0;
    return result;
  } catch (err: any) {
    failureCount++;
    console.error(`📊 SALES DB FAILURE [${failureCount}]:`, err.message);
    throw new AppError('Database operation failed', 500);
  }
};

export const saleRepository = {
  findAll: () => safeQuery(() => prisma.sale.findMany({
    include: { product: true },
    orderBy: { createdAt: 'desc' }
  })),

  create: (data: any) => safeQuery(() => prisma.$transaction(async (tx) => {
    // 1. Create Sale
    const sale = await tx.sale.create({ data });

    // 2. Update Stock
    await tx.product.update({
      where: { id: data.productId },
      data: { stock: { decrement: data.quantity } }
    });

    return sale;
  }))
};
