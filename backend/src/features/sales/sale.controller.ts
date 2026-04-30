import { Response } from 'express';
import { AuthRequest } from '../../types';
import * as saleService from './sale.service';
import asyncHandler from '../../utils/asyncHandler';
import { createSaleSchema } from '../../validation/schemas';
import { sendSuccess, sendError } from '../../utils/response';

export const getAll = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const sales = await saleService.getSales();
  return sendSuccess(res, sales, 'Sales fetched successfully');
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = createSaleSchema.parse(req.body);
    const soEmail = req.user?.email || 'unknown@example.com';
    
    const sale = await saleService.createSale(validatedData, soEmail);
    return sendSuccess(res, sale, 'Sale recorded successfully and stock updated', 201);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return sendError(res, 'Invalid sale data: ' + err.message, 400);
    }
    throw err;
  }
});

export const updateStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return sendError(res, 'Status is required', 400);
  }

  const sale = await saleService.updateStatus(id, status);
  return sendSuccess(res, sale, `Order status updated to ${status}`);
});

export const getById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const sale = await saleService.getSaleById(id);
  if (!sale) {
    return sendError(res, 'Order not found', 404);
  }
  return sendSuccess(res, sale, 'Order fetched successfully');
});

export const getItems = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const sale = await saleService.getSaleById(id);
  if (!sale) {
    return sendError(res, 'Order not found', 404);
  }
  return sendSuccess(res, sale.items || [], 'Order items fetched successfully');
});


export const updateItems = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { items } = req.body;
  if (!items) {
    return sendError(res, 'Items are required', 400);
  }
  const sale = await saleService.updateItems(id, items);
  return sendSuccess(res, sale, 'Order items updated successfully');
});
