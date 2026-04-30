import { Response } from 'express';
import { AuthRequest } from '../../types';
import * as productService from './product.service';
import asyncHandler from '../../utils/asyncHandler';
import { productSchema } from '../../validation/schemas';
import { sendSuccess, sendError } from '../../utils/response';

export const getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const products = await productService.getAllProducts(req.user!.userId, req.user!.role, req.user!.companyId);
  return sendSuccess(res, products, 'Products fetched successfully');
});

export const getById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const product = await productService.getProductById(id, req.user!.companyId);
  if (!product) {
    return sendError(res, 'Product not found', 404);
  }
  return sendSuccess(res, product, 'Product fetched successfully');
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const validatedData = productSchema.parse(req.body);
  const product = await productService.createProduct(validatedData, req.user!.companyId!);
  return sendSuccess(res, product, 'Product created successfully', 201);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const validatedData = productSchema.partial().parse(req.body);
  const product = await productService.updateProduct(id, validatedData, req.user!.companyId!);
  
  return sendSuccess(res, product, 'Product updated successfully');
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  await productService.deleteProduct(id, req.user!.companyId!);
  return sendSuccess(res, null, 'Product deleted successfully');
});

export const getSubCategories = asyncHandler(async (req: AuthRequest, res: Response) => {
  const products = await productService.getAllProducts(req.user!.userId, req.user!.role, req.user!.companyId);
  const categories = Array.from(new Set(products.map(p => (p as any).categoryRef?.name))).filter(Boolean);
  return sendSuccess(res, categories, 'Categories fetched successfully');
});
