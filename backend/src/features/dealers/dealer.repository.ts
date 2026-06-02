import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { DealerInput } from '../../validation/schemas';

/**
 * DEALER REPOSITORY (ELITE)
 */

let failureCount = 0;
const BREAKER_THRESHOLD = 5;
const DB_CONN_ERRS = ["Can't reach database server", 'ECONNREFUSED', 'P1001', 'P1002', 'P1008', 'P1017'];
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
    console.error(`📊 DEALER DB FAILURE [${failureCount}]:`, error.message);
    if ((error as any).code === 'P2002') throw new AppError('Record already exists', 400);
    throw new AppError('Database operation failed', 500);
  }
};

export const dealerRepository = {
  findAll: () => safeQuery(() => prisma.dealer.findMany({ orderBy: { dealerName: 'asc' } }) as Promise<any[]>, [] as any[]),

  findByCode: (dealerCode: string) => safeQuery(() => prisma.dealer.findUnique({ where: { dealerCode } }), null as any),

  create: (data: DealerInput) => safeQuery(() => prisma.dealer.create({
    data: { ...data, creditLimit: data.creditLimit || 0, active: true, companyId: 'cmo75yliq0000wesurjpett1n' }
  })),

  update: (dealerCode: string, data: Partial<DealerInput>) => safeQuery(() => prisma.dealer.update({ where: { dealerCode }, data })),

  delete: (dealerCode: string) => safeQuery(() => prisma.dealer.delete({ where: { dealerCode } }))
};
