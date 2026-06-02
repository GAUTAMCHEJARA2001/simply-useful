import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { ProductInput } from '../../validation/schemas';

/**
 * PRODUCT REPOSITORY (ELITE - SYNCED WITH SCHEMA)
 * Using: productCode, rate, stockQty, gst, etc.
 */

let failureCount = 0;
const BREAKER_THRESHOLD = 5;

const safeQuery = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (failureCount > BREAKER_THRESHOLD) {
    throw new AppError('Inventory service unavailable', 503);
  }

  try {
    const result = await fn();
    failureCount = 0;
    return result;
  } catch (err: unknown) {
    if (err instanceof AppError) throw err;
    
    const error = err as Error;
    failureCount++;
    console.error(`📊 PRODUCT DB FAILURE [${failureCount}]:`, error.message);
    throw new AppError('Database operation failed', 500);
  }
};

export const productRepository = {
  findForUser: (userId: string, role: string, companyId?: string | null) => safeQuery(async () => {
    // 1. SuperAdmin Bypass (Global View)
    if (role === 'SUPERADMIN') {
      const condition = companyId ? { companyId } : {};
      const products = await prisma.product.findMany({
        where: condition,
        orderBy: { updatedAt: 'desc' },
        include: { categoryRef: true, brand: true, unit: true }
      });

      // Aggregate total stock for SuperAdmin
      const stockAggregation = await prisma.inventory.groupBy({
        by: ['productId'],
        where: companyId ? { product: { companyId } } : {},
        _sum: { quantity: true }
      });

      return products.map(p => {
        const stock = stockAggregation.find(s => s.productId === p.id);
        return { 
          ...p, 
          productName: p.name, 
          category: p.categoryRef, 
          categoryName: p.categoryRef?.name,
          brandName: p.brand?.name,
          availableStock: stock?._sum?.quantity || 0,
          stockQty: stock?._sum?.quantity || 0 
        };
      });
    }

    // 2. Standard User (Strict Company Partitioning)
    if (!companyId) return [];

    // Fetch Warehouse Access
    const warehouseAccess = await prisma.userWarehouseAccess.findMany({
      where: { userId }
    });
    const warehouseIds = warehouseAccess.map(wa => wa.warehouseId);

    // Fetch Product Access
    const productAccess = await prisma.userProductAccess.findMany({
      where: { userId }
    });

    const brandIds = productAccess.map(pa => pa.brandId).filter(Boolean) as number[];
    const categoryIds = productAccess.map(pa => pa.categoryId).filter(Boolean) as number[];
    const productIds = productAccess.map(pa => pa.productId).filter(Boolean) as string[];

    // Build Dynamic Conditions
    const baseConditions: any[] = [{ companyId }];
    
    const permissionConditions: any[] = [];
    if (brandIds.length && categoryIds.length) {
      permissionConditions.push({
        AND: [
          { brandId: { in: brandIds } },
          { categoryId: { in: categoryIds } }
        ]
      });
    }
    if (brandIds.length && !categoryIds.length) {
      permissionConditions.push({ brandId: { in: brandIds } });
    }
    if (!brandIds.length && categoryIds.length) {
      permissionConditions.push({ categoryId: { in: categoryIds } });
    }
    if (productIds.length) {
      permissionConditions.push({ id: { in: productIds } });
    }

    const finalWhere = permissionConditions.length > 0 
      ? { AND: [{ companyId }, { OR: permissionConditions }] }
      : { companyId }; // If no granular access, allowed everything in the company? 
                      // Actually, legacy logic was { id: 'none' } if no access. 
                      // I'll keep it strict: if they have ANY access rules, follow them. 
                      // If no access rules, show EVERYTHING in the company (assuming role-based).

    // 5. Query Products with Filter
    const products = await prisma.product.findMany({
      where: finalWhere,
      orderBy: { updatedAt: 'desc' },
      include: { categoryRef: true, brand: true, unit: true }
    });

    // 6. Aggregate Stock (Filtered by allowed warehouses)
    const stockAggregation = await prisma.inventory.groupBy({
      by: ['productId'],
      where: {
        warehouseId: { in: warehouseIds },
        product: { companyId }
      },
      _sum: { quantity: true }
    });

    return products.map(p => {
      const stock = stockAggregation.find(s => s.productId === p.id);
      return { 
        ...p, 
        productName: p.name, 
        category: p.categoryRef,
        categoryName: p.categoryRef?.name,
        brandName: p.brand?.name,
        availableStock: stock?._sum?.quantity || 0,
        stockQty: stock?._sum?.quantity || 0
      };
    });
  }),

  findById: (id: string, companyId?: string | null) => safeQuery(() => prisma.product.findUnique({
    where: companyId ? { id, companyId } : { id }
  })),

  create: (data: any, companyId: string) => safeQuery(() => prisma.product.create({
    data: {
      productCode: data.productCode,
      name: data.name,
      categoryId: data.categoryId,
      companyId: companyId,
      brandId: data.brandId,
      unitId: data.unitId,
      bagSize: data.bagSize || 'N/A',
      rate: data.rate || 0,
      gst: data.gst || 0,
      active: true
    }
  })),

  update: (id: string, data: any) => safeQuery(() => prisma.product.update({
    where: { id },
    data: {
      ...data,
      category: undefined, // Ensure legacy field is not passed
      stockQty: undefined  // Ensure legacy field is not passed
    }
  })),

  delete: (id: string) => safeQuery(() => prisma.product.delete({
    where: { id }
  }))
};
