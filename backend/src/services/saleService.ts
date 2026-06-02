import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllSales = async () => {
  return prisma.order.findMany({
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { date: 'desc' },
  });
};

export const getSaleById = async (id: string) => {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
};

export const createSale = async (data: any, soEmail: string) => {
  const { partyType, partyName, distributor, items, narration, grandTotal } = data;

  // Use a transaction to ensure atomicity
  return prisma.$transaction(async (tx) => {
    // 1. Create the Order
    const order = await tx.order.create({
      data: {
        orderId: `ORD-${Date.now()}`,
        date: new Date(),
        soEmail: soEmail,
        partyType,
        partyName,
        distributor,
        narration,
        grandTotal,
        status: 'Pending',
        companyId: 'cmo75yliq0000wesurjpett1n' // Added required companyId
      },
    });

    // 2. Process each item
    for (const item of items) {
      // Find current stock in default warehouse (ID 1)
      const stock = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: data.warehouseId || 1
          }
        }
      });

      if (!stock || stock.quantity < item.qty) {
        throw new Error(`Insufficient stock for product. Available: ${stock?.quantity || 0}`);
      }

      // 4. Create OrderItem
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          qty: item.qty,
          price: item.price,
          total: item.total,
          itemRemark: item.itemRemark,
        },
      });

      // 5. Decrement Inventory Stock (Atomic)
      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: data.warehouseId || 1
          }
        },
        data: {
          quantity: { decrement: item.qty },
        },
      });
    }

    return tx.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  });
};
