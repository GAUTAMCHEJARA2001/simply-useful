import { PrismaClient } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';

const prisma = new PrismaClient();

export type ValuationMethod = 'FIFO' | 'LIFO' | 'WEIGHTED_AVG';

export class ValuationService {
  /**
   * Record new stock arrival (Purchase, Production, or Adjustment Plus)
   */
  static async addStock(tx: any, data: {
    productId: string;
    warehouseId: number;
    quantity: number;
    cost: number;
    companyId: string;
  }) {
    const { productId, warehouseId, quantity, cost, companyId } = data;

    // 1. Create a Batch for FIFO/LIFO
    await tx.stockBatch.create({
      data: {
        productId,
        warehouseId,
        quantity,
        remaining: quantity,
        cost,
        companyId
      }
    });

    // 2. Update Inventory Aggregates (Quantity and Weighted Average)
    const inventory = await tx.inventory.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } }
    });

    if (inventory) {
      const currentQty = inventory.quantity;
      const currentAvgCost = inventory.avgCost || 0;
      
      const newQty = currentQty + quantity;
      // Weighted Average Formula: (OldQty * OldCost + NewQty * NewCost) / TotalQty
      const newAvgCost = ((currentQty * currentAvgCost) + (quantity * cost)) / newQty;

      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: newQty,
          avgCost: newAvgCost
        }
      });
    } else {
      // Initialize inventory if not exists
      await tx.inventory.create({
        data: {
          productId,
          warehouseId,
          quantity,
          avgCost: cost
        }
      });
    }
  }

  /**
   * Consume stock for a Sale or Adjustment Minus
   * Returns the total cost of units consumed (for COGS tracking)
   */
  static async consumeStock(tx: any, data: {
    productId: string;
    warehouseId: number;
    quantity: number;
    method: ValuationMethod;
    companyId: string;
  }) {
    const { productId, warehouseId, quantity, method } = data;
    let remainingToConsume = quantity;
    let totalConsumedCost = 0;

    // 1. Fetch relevant batches based on method
    const batches = await tx.stockBatch.findMany({
      where: {
        productId,
        warehouseId,
        remaining: { gt: 0 }
      },
      orderBy: { createdAt: method === 'LIFO' ? 'desc' : 'asc' }
    });

    // 2. Consume layers
    for (const batch of batches) {
      if (remainingToConsume <= 0) break;

      const consumeFromThisBatch = Math.min(batch.remaining, remainingToConsume);
      remainingToConsume -= consumeFromThisBatch;
      totalConsumedCost += (consumeFromThisBatch * batch.cost);

      await tx.stockBatch.update({
        where: { id: batch.id },
        data: { remaining: { decrement: consumeFromThisBatch } }
      });
    }

    if (remainingToConsume > 0) {
      throw new AppError(`Insufficient specific stock batches for product ${productId}. Needed ${remainingToConsume} more units.`, 400);
    }

    // 3. Update Global Inventory Quantity
    await tx.inventory.update({
      where: { productId_warehouseId: { productId, warehouseId } },
      data: { quantity: { decrement: quantity } }
    });

    return totalConsumedCost;
  }

  /**
   * Calculate current stock value for a product
   */
  static async calculateStockValue(productId: string, companyId: string, method: ValuationMethod) {
    const inventoryItems = await prisma.inventory.findMany({
      where: { productId, product: { companyId } }
    });

    let totalValue = 0;

    for (const inv of inventoryItems) {
      if (method === 'WEIGHTED_AVG') {
        totalValue += (inv.quantity * (inv.avgCost || 0));
      } else {
        // For FIFO/LIFO, we sum the remaining quantities in batches
        const batches = await prisma.stockBatch.findMany({
          where: { productId, warehouseId: inv.warehouseId, remaining: { gt: 0 } }
        });
        totalValue += batches.reduce((sum, b) => sum + (b.remaining * b.cost), 0);
      }
    }

    return totalValue;
  }
}
