import { prisma } from '../../lib/prisma';
import { safeQuery as globalSafeQuery } from '../../utils/safeQuery';

const safeQuery = <T>(fn: () => Promise<T>, fallback?: T) => 
  globalSafeQuery('MASTER', fn, fallback);

export const masterRepository = {
  // Categories
  findAllCategories: (companyId: string) => safeQuery(() => prisma.category.findMany({
    where: { active: true, companyId },
    orderBy: { name: 'asc' }
  })),

  createCategory: (data: { name: string, parentId?: number | null, companyId: string }) => safeQuery(() => prisma.category.create({
    data: {
      name: data.name,
      companyId: data.companyId,
      parentId: data.parentId || null
    }
  })),

  updateCategory: (id: number, data: { name?: string, parentId?: number | null, active?: boolean }) => safeQuery(() => prisma.category.update({
    where: { id },
    data: {
      name: data.name,
      parentId: data.parentId,
      active: data.active
    }
  })),

  // Warehouses
  findAllWarehouses: (companyId: string) => safeQuery(() => prisma.warehouse.findMany({
    where: { active: true, companyId },
    orderBy: { name: 'asc' }
  })),

  createWarehouse: (data: { name: string, location?: string, gstNumber?: string, companyId: string }) => safeQuery(() => prisma.warehouse.create({
    data: data
  })),

  // Suppliers (Distributors)
  findAllSuppliers: (companyId: string) => safeQuery(() => prisma.distributor.findMany({
    where: { active: true, companyId },
    orderBy: { distributorName: 'asc' }
  })),

  createSupplier: (data: any) => safeQuery(() => prisma.distributor.create({
    data: {
      ...data,
      companyId: 'cmo75yliq0000wesurjpett1n'
    }
  })),

  updateSupplier: (id: string, data: any) => safeQuery(() => prisma.distributor.update({
    where: { id },
    data: data
  }))
};
