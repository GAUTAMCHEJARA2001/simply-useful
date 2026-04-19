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
      },
    });

    // 2. Process each item
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found`);
      }

      // 3. Check stock levels (Edge case handling)
      if (product.stockQty < item.qty) {
        throw new Error(`Insufficient stock for product: ${product.name}. Available: ${product.stockQty}, Requested: ${item.qty}`);
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

      // 5. Decrement Product Stock (Atomic)
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQty: {
            decrement: item.qty,
          },
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
