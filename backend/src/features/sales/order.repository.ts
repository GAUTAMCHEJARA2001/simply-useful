import prisma from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

/**
 * ORDER REPOSITORY (ELITE - SYNCED WITH SCHEMA)
 * Using: Order, OrderItem, orderId, soEmail, etc.
 */

let failureCount = 0;
const BREAKER_THRESHOLD = 5;

const safeQuery = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (failureCount > BREAKER_THRESHOLD) {
    throw new AppError('Order service unavailable', 503);
  }

  try {
    const result = await fn();
    failureCount = 0;
    return result;
  } catch (err: any) {
    failureCount++;
    console.error(`📊 ORDER DB FAILURE [${failureCount}]:`, err.message);
    throw new AppError('Database operation failed', 500);
  }
};

export const orderRepository = {
  findAll: () => safeQuery(() => prisma.order.findMany({
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' }
  })),

  findById: (id: string) => safeQuery(() => prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } }
  })),

  create: (data: any) => safeQuery(() => prisma.$transaction(async (tx) => {
    const { soEmail, partyType, partyName, distributor, grandTotal, items } = data;

    // 1. Create the Order
    const order = await tx.order.create({
      data: {
        orderId: `ORD-${Date.now()}`,
        soEmail,
        partyType,
        partyName,
        distributor,
        grandTotal,
        status: 'Pending',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            qty: item.qty,
            price: item.price,
            total: item.price * item.qty
          }))
        }
      }
    });

    // 2. Perform Stock Adjustments
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQty: { decrement: item.qty } }
      });
    }

    return order;
  }))
};
