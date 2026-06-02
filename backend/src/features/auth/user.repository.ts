import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

/**
 * USER REPOSITORY (ELITE - REFINED PER SENIOR REVIEW)
 * Features: 
 * - Multi-warehouse assignment
 * - Granular product/brand/category access
 * - Transactional "delete-and-replace" logic
 */

let failureCount = 0;
const BREAKER_THRESHOLD = 5;
const DB_CONN_ERRS = ["Can't reach database server",'ECONNREFUSED','P1001','P1002','P1008','P1017'];
const isDbConnErr = (e: any) => DB_CONN_ERRS.some(k => ((e.message||'')+(e.code||'')).includes(k));

const safeQuery = async <T>(fn: () => Promise<T>, fallback?: T): Promise<T> => {
  if (failureCount > BREAKER_THRESHOLD) return (fallback ?? [] as unknown as T);
  try {
    const result = await fn();
    failureCount = 0;
    return result;
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    failureCount++;
    if (isDbConnErr(error)) return (fallback ?? [] as unknown as T);
    console.error(`📊 USER DB FAILURE [${failureCount}]:`, error.message);
    throw new AppError('Database operation failed', 500);
  }
};

export const userRepository = {
  // 1. Assign Product Access (Atomic Transaction)
  setProductAccess: (userId: string, accessEntries: { brandId?: number, categoryId?: number, productId?: string }[]) => safeQuery(async () => {
    // Validation: Each entry must have at least one valid field
    for (const entry of accessEntries) {
      if (!entry.brandId && !entry.categoryId && !entry.productId) {
        throw new AppError('Invalid access record: At least one brand, category, or product must be specified', 400);
      }
    }

    return await prisma.$transaction([
      prisma.userProductAccess.deleteMany({ where: { userId } }),
      prisma.userProductAccess.createMany({
        data: accessEntries.map(e => ({
          userId,
          brandId: e.brandId || null,
          categoryId: e.categoryId || null,
          productId: e.productId || null
        }))
      })
    ]);
  }),

  // 2. Assign Warehouse Access (Atomic Transaction)
  setWarehouseAccess: (userId: string, warehouseIds: number[]) => safeQuery(async () => {
    return await prisma.$transaction([
      prisma.userWarehouseAccess.deleteMany({ where: { userId } }),
      prisma.userWarehouseAccess.createMany({
        data: warehouseIds.map(id => ({
          userId,
          warehouseId: id
        }))
      })
    ]);
  }),

  // 3. Get User with all access mappings
  getUserAccess: (userId: string) => safeQuery(() => prisma.user.findUnique({
    where: { id: userId },
    include: {
      productAccess: {
        include: { brand: true, category: true, product: true }
      },
      warehouseAccess: {
        include: { warehouse: true }
      }
    }
  }))
};
