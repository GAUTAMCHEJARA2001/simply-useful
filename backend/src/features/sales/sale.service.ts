import { orderRepository } from './order.repository';
import { AppError } from '../../middleware/errorHandler';
import { CreateSaleInput } from '../../validation/schemas';

/**
 * SALE SERVICE (ELITE - SYNCED WITH SCHEMA)
 * Coordination for Orders and OrderItems.
 */

export const getSales = async () => {
  return await orderRepository.findAll();
};

export const createSale = async (data: CreateSaleInput, soEmail: string) => {
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
    warehouseId: data.warehouseId,
    items
  });
};

export const updateStatus = async (id: string, status: any) => {
  return await orderRepository.updateStatus(id, status);
};

export const getSaleById = async (id: string) => {
  return await orderRepository.findById(id);
};

export const updateItems = async (id: string, items: any) => {
  return await orderRepository.updateItems(id, items);
};

export const updateOrder = async (id: string, data: any) => {
  return await orderRepository.updateOrder(id, data);
};

export const partialDispatch = async (id: string, data: any) => {
  return await orderRepository.partialDispatch(id, data);
};

export const partialReturn = async (id: string, data: any) => {
  return await orderRepository.partialReturn(id, data);
};

export const getDispatchLogs = async (id: string) => {
  return await orderRepository.getDispatchLogs(id);
};

export const getReturnLogs = async (id: string) => {
  return await orderRepository.getReturnLogs(id);
};
