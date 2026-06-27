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
const DB_CONN_ERRS = ["Can't reach database server", 'ECONNREFUSED', 'P1001', 'P1002', 'P1008', 'P1017'];
const isDbConnErr = (e: any) => DB_CONN_ERRS.some(k => ((e.message||'')+(e.code||'')).includes(k));

const safeQuery = async <T>(fn: () => Promise<T>, fallback?: T): Promise<T> => {
  if (failureCount > BREAKER_THRESHOLD) return (fallback ?? [] as unknown as T);
  try {
    const result = await fn();
    failureCount = 0;
    return result;
  } catch (err: unknown) {
    if (err instanceof AppError) throw err;
    const error = err as Error & { code?: string };
    failureCount++;
    if (isDbConnErr(error)) return (fallback ?? [] as unknown as T);
    console.error(`📊 ORDER DB FAILURE [${failureCount}]:`, error.message);
    throw new AppError('Database operation failed', 500);
  }
};

export const orderRepository = {
  findAll: () => safeQuery(() => prisma.order.findMany({
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' }
  }), []),

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
        companyId: 'cmo75yliq0000wesurjpett1n', // Added required companyId
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
  })),

  updateOrder: (idOrOrderId: string, data: any) => safeQuery(() => prisma.$transaction(async (tx) => {
    // 1. Find the order by id or orderId
    const order = await tx.order.findFirst({
      where: {
        OR: [
          { id: idOrOrderId },
          { orderId: idOrOrderId }
        ]
      }
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // 2. Delete old items
    await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    
    // 3. Create new items and update order details
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        narration: data.narration,
        grandTotal: data.grandTotal,
        partyName: data.partyName,
        distributor: data.distributor,
        soEmail: data.soEmail,
        items: {
          create: data.items.map((item: any) => ({
            productId: item.productId,
            qty: item.qty,
            price: item.price,
            total: item.price * item.qty,
            itemRemark: item.itemRemark
          }))
        }
      },
      include: { items: true }
    });

    return updatedOrder;
  })),

  partialDispatch: (orderId: string, data: any) => safeQuery(() => prisma.$transaction(async (tx) => {
    // 1. Find the order
    const order = await tx.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { orderId: orderId }
        ]
      },
      include: { items: true }
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Only allow dispatch for Approved or Partially Dispatched orders
    if (!['Approved', 'Partially Dispatched'].includes(order.status)) {
      throw new AppError(`Cannot dispatch order with status "${order.status}". Order must be Approved or Partially Dispatched.`, 400);
    }

    const { items, invoiceNumber, vehicleNumber, driverName, driverMobile, warehouseId, dispatchDate } = data;

    // 2. Validate and update each item
    for (const dispatchItem of items) {
      const orderItem = order.items.find(i => i.id === dispatchItem.orderItemId);
      if (!orderItem) {
        throw new AppError(`Order item ${dispatchItem.orderItemId} not found`, 404);
      }

      const remaining = orderItem.qty - orderItem.sentQty;
      if (dispatchItem.qty > remaining) {
        throw new AppError(
          `Cannot dispatch ${dispatchItem.qty} of product. Only ${remaining} remaining (ordered: ${orderItem.qty}, already sent: ${orderItem.sentQty})`,
          400
        );
      }

      // Update sentQty on the order item
      await tx.orderItem.update({
        where: { id: dispatchItem.orderItemId },
        data: { sentQty: { increment: dispatchItem.qty } }
      });

      // Create dispatch log entry
      await tx.dispatchLog.create({
        data: {
          orderId: order.id,
          orderItemId: dispatchItem.orderItemId,
          productId: dispatchItem.productId,
          qty: dispatchItem.qty,
          invoiceNumber: invoiceNumber || null,
          vehicleNumber: vehicleNumber || null,
          driverName: driverName || null,
          driverMobile: driverMobile || null,
          warehouseId: warehouseId || null,
          dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
        }
      });
    }

    // 3. Re-fetch items to compute new status
    const updatedItems = await tx.orderItem.findMany({ where: { orderId: order.id } });
    const allFullySent = updatedItems.every(i => i.sentQty >= i.qty);
    const anySent = updatedItems.some(i => i.sentQty > 0);

    let newStatus = order.status;
    if (allFullySent) {
      newStatus = 'Dispatched';
    } else if (anySent) {
      newStatus = 'Partially Dispatched';
    }

    // 4. Update order status and dispatch metadata
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: newStatus,
        invoiceNumber: invoiceNumber || order.invoiceNumber,
        vehicleNumber: vehicleNumber || order.vehicleNumber,
        driverName: driverName || order.driverName,
        driverMobile: driverMobile || order.driverMobile,
        dispatchWarehouse: warehouseId ? String(warehouseId) : order.dispatchWarehouse,
        dispatchDate: dispatchDate || order.dispatchDate,
      },
      include: { items: { include: { product: true } } }
    });

    return updatedOrder;
  })),

  partialReturn: (orderId: string, data: any) => safeQuery(() => prisma.$transaction(async (tx) => {
    // 1. Find the order
    const order = await tx.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { orderId: orderId }
        ]
      },
      include: { items: true }
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Only allow return for dispatched/completed/partially returned orders
    if (!['Dispatched', 'Completed', 'Partially Dispatched', 'Partially Returned'].includes(order.status)) {
      throw new AppError(`Cannot return items for order with status "${order.status}". Order must be Dispatched, Completed, or Partially Returned.`, 400);
    }

    const { items, returnReason, challanNumber, vehicleNumber, returnDate, warehouseId } = data;

    // 2. Validate and update each item
    for (const returnItem of items) {
      const orderItem = order.items.find(i => i.id === returnItem.orderItemId);
      if (!orderItem) {
        throw new AppError(`Order item ${returnItem.orderItemId} not found`, 404);
      }

      const maxReturnable = orderItem.sentQty - orderItem.returnedQty;
      if (returnItem.qty > maxReturnable) {
        throw new AppError(
          `Cannot return ${returnItem.qty}. Max returnable: ${maxReturnable} (dispatched: ${orderItem.sentQty}, already returned: ${orderItem.returnedQty})`,
          400
        );
      }

      // Update returnedQty on the order item
      await tx.orderItem.update({
        where: { id: returnItem.orderItemId },
        data: { returnedQty: { increment: returnItem.qty } }
      });

      // Restore inventory stock (auto-increment)
      // Find the warehouse to restore to - use the provided warehouseId or default to 1
      const restoreWarehouseId = warehouseId || 1;
      const existingStock = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: returnItem.productId,
            warehouseId: restoreWarehouseId
          }
        }
      });

      if (existingStock) {
        await tx.inventory.update({
          where: {
            productId_warehouseId: {
              productId: returnItem.productId,
              warehouseId: restoreWarehouseId
            }
          },
          data: { quantity: { increment: returnItem.qty } }
        });
      }

      // Create return log entry
      await tx.returnLog.create({
        data: {
          orderId: order.id,
          orderItemId: returnItem.orderItemId,
          productId: returnItem.productId,
          qty: returnItem.qty,
          returnReason: returnReason || null,
          challanNumber: challanNumber || null,
          vehicleNumber: vehicleNumber || null,
          returnDate: returnDate ? new Date(returnDate) : new Date(),
        }
      });
    }

    // 3. Re-fetch items to compute new status
    const updatedItems = await tx.orderItem.findMany({ where: { orderId: order.id } });
    const allFullyReturned = updatedItems.every(i => i.returnedQty >= i.sentQty && i.sentQty > 0);
    const anyReturned = updatedItems.some(i => i.returnedQty > 0);

    let newStatus = order.status;
    if (allFullyReturned) {
      newStatus = 'Returned';
    } else if (anyReturned) {
      newStatus = 'Partially Returned';
    }

    // 4. Update order status
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: { status: newStatus },
      include: { items: { include: { product: true } } }
    });

    return updatedOrder;
  })),

  getDispatchLogs: (orderId: string) => safeQuery(() => prisma.dispatchLog.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' }
  }), []),

  getReturnLogs: (orderId: string) => safeQuery(() => prisma.returnLog.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' }
  }), []),
};
