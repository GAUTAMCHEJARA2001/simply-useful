import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllProducts = async () => {
  return prisma.product.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });
};

export const getProductById = async (id: string) => {
  return prisma.product.findUnique({
    where: { id },
  });
};

export const createProduct = async (data: any) => {
  return prisma.product.create({
    data: {
      productCode: data.productCode,
      name: data.name,
      categoryId: Number(data.categoryId) || 1,
      bagSize: data.bagSize,
      brandId: data.brandId ? Number(data.brandId) : undefined,
      unitId: data.unitId ? Number(data.unitId) : undefined,
      rate: Number(data.rate),
      gst: Number(data.gst),
    },
  });
};

export const updateProduct = async (id: string, data: any) => {
  return prisma.product.update({
    where: { id },
    data: data,
  });
};

export const deleteProduct = async (id: string) => {
  return prisma.product.update({
    where: { id },
    data: { active: false },
  });
};
