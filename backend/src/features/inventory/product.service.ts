import { productRepository } from './product.repository';
import { AppError } from '../../middleware/errorHandler';
import { ProductInput } from '../../validation/schemas';

/**
 * PRODUCT SERVICE (ELITE - SYNCED WITH SCHEMA)
 * Using: productCode, stockQty, rate, etc.
 */

export const getAllProducts = async (userId: string, role: string, companyId?: string | null) => {
  return await productRepository.findForUser(userId, role, companyId);
};

export const getProductById = async (id: string, companyId?: string | null) => {
  const product = await productRepository.findById(id, companyId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }
  return product;
};

export const createProduct = async (data: any, companyId: string) => {
  const { productCode, name, rate } = data;

  if (!productCode || !name) {
    throw new AppError('Product Code and Name are required', 400);
  }

  return await productRepository.create(data, companyId);
};

export const updateProduct = async (id: string, data: any, companyId: string) => {
  await getProductById(id, companyId);
  return await productRepository.update(id, data);
};

export const deleteProduct = async (id: string, companyId: string) => {
  await getProductById(id, companyId);
  return await productRepository.delete(id);
};
