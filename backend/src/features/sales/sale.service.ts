import { orderRepository } from './order.repository';
import { AppError } from '../../middleware/errorHandler';

/**
 * SALE SERVICE (ELITE - SYNCED WITH SCHEMA)
 * Coordination for Orders and OrderItems.
 */

export const getSales = async () => {
  return await orderRepository.findAll();
};

export const createSale = async (data: any, soEmail: string) => {
  const { partyType, partyName, distributor, items, grandTotal } = data;

  // 1. Validation
  if (!items || items.length === 0 || !soEmail) {
    throw new AppError('Invalid order data: products and sales officer required', 400);
  }

  // 2. Repository Execution (Stock logic and transactions are in repo)
  return await orderRepository.create({
    soEmail,
    partyType,
    partyName,
    distributor,
    grandTotal,
    items
  });
};
