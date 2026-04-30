import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CreateSaleInput, SaleItemInput } from '../../validation/schemas';

interface CreateOrderData extends CreateSaleInput {
  soEmail: string;
}

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
  } catch (err: unknown) {
    if (err instanceof AppError) throw err;
    
    const error = err as Error;
    failureCount++;
    console.error(`📊 ORDER DB FAILURE [${failureCount}]:`, error.message);
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

  create: (data: CreateOrderData & { warehouseId: number }) => safeQuery(() => prisma.$transaction(async (tx) => {
    const { soEmail, partyType, partyName, distributor, grandTotal, items, warehouseId } = data;

    // 1. Validate Warehouse Access (Already handled in Controller, but DB check is safer)
    const warehouse = await tx.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) {
      throw new AppError('Invalid warehouse selected', 400);
    }

    // 2. Create the Order
    const order = await tx.order.create({
      data: {
        orderId: `ORD-${Date.now()}`,
        soEmail,
        partyType,
        partyName,
        distributor: distributor || 'N/A',
        grandTotal,
        status: 'Pending',
        items: {
          create: items.map((item: SaleItemInput) => ({
            productId: item.productId,
            qty: item.qty,
            price: item.price,
            total: item.price * item.qty
          }))
        }
      }
    });

    // 3. Perform Atomic Stock Adjustments
    for (const item of items) {
      // Find current stock for this product in this warehouse
      const stock = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: warehouseId
          }
        }
      });

      if (!stock) {
        throw new AppError(`Stock not initialized for product ${item.productId} in this warehouse`, 400);
      }

      if (stock.quantity < item.qty) {
        throw new AppError(`Insufficient stock for product ${item.productId}. Available: ${stock.quantity}`, 400);
      }

      // Decrement stock
      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: warehouseId
          }
        },
        data: {
          quantity: { decrement: item.qty }
        }
      });
    }

    return order;
  })),

  updateStatus: (id: string, status: any) => safeQuery(() => prisma.order.update({
    where: { id },
    data: { status }
  })),

  updateItems: (id: string, items: any) => safeQuery(() => prisma.$transaction(async (tx) => {
    // 1. Delete old items
    await tx.orderItem.deleteMany({ where: { orderId: id } });
    
    // 2. Create new items
    const updatedOrder = await tx.order.update({
      where: { id },
      data: {
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            qty: item.qty,
            price: item.price,
            total: item.price * item.qty
          }))
        }
      },
      include: { items: true }
    });

    return updatedOrder;
  }))
};
