import { Request, Response } from 'express';
import * as saleService from './sale.service';
import asyncHandler from '../../utils/asyncHandler';
import { createSaleSchema } from '../../validation/schemas';
import { sendSuccess, sendError } from '../../utils/response';

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const sales = await saleService.getAllSales();
  return sendSuccess(res, sales, 'Sales fetched successfully');
});

export const create = asyncHandler(async (req: any, res: Response) => {
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
