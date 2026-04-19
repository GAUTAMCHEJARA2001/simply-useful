import { Request, Response } from 'express';
import * as productService from './product.service';
import asyncHandler from '../../utils/asyncHandler';
import { productSchema } from '../../validation/schemas';
import { sendSuccess, sendError } from '../../utils/response';

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const products = await productService.getAllProducts();
  return sendSuccess(res, products, 'Products fetched successfully');
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = productSchema.parse(req.body);
  const product = await productService.createProduct(validatedData);
  return sendSuccess(res, product, 'Product created successfully', 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const existingProduct = await productService.getProductById(id);
  if (!existingProduct) {
    return sendError(res, 'Product not found', 404);
  }

  const validatedData = productSchema.partial().parse(req.body);
  const product = await productService.updateProduct(id, validatedData);
  
  return sendSuccess(res, product, 'Product updated successfully');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const existingProduct = await productService.getProductById(id);
  if (!existingProduct) {
    return sendError(res, 'Product not found', 404);
  }

  await productService.deleteProduct(id);
  return sendSuccess(res, null, 'Product deleted successfully');
});
