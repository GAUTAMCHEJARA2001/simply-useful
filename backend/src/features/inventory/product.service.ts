import { productRepository } from './product.repository';
import { AppError } from '../../middleware/errorHandler';

/**
 * PRODUCT SERVICE (ELITE - SYNCED WITH SCHEMA)
 * Using: productCode, stockQty, rate, etc.
 */

export const getAllProducts = async () => {
  return await productRepository.findAll();
};

export const getProductById = async (id: string) => {
  const product = await productRepository.findById(id);
  if (!product) {
    throw new AppError('Product not found', 404);
  }
  return product;
};

export const createProduct = async (data: any) => {
  const { productCode, name, rate, stockQty } = data;

  if (!productCode || !name) {
    throw new AppError('Product Code and Name are required', 400);
  }

  return await productRepository.create({
    productCode,
    name,
    category: data.category || 'General',
    bagSize: data.bagSize || 'N/A',
    rate: rate || 0,
    gst: data.gst || 0,
    stockQty: stockQty || 0
  });
};

export const updateProduct = async (id: string, data: any) => {
  await getProductById(id);
  return await productRepository.update(id, data);
};

export const deleteProduct = async (id: string) => {
  await getProductById(id);
  return await productRepository.delete(id);
};
