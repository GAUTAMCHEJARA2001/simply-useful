import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { VisitInput } from '../../validation/schemas';

/**
 * VISIT REPOSITORY (ELITE)
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
    console.error(`📊 VISIT DB FAILURE [${failureCount}]:`, error.message);
    throw new AppError('Database operation failed', 500);
  }
};

export const visitRepository = {
  findAll: () => safeQuery(() => prisma.visit.findMany({
    orderBy: { createdAt: 'desc' }
  })),

  findByUser: (email: string) => safeQuery(() => prisma.visit.findMany({
    where: { soEmail: email },
    orderBy: { createdAt: 'desc' }
  })),

  create: (data: VisitInput) => safeQuery(() => prisma.visit.create({
    data: {
      ...data,
      nextFollowup: data.nextFollowup ? new Date(data.nextFollowup) : undefined,
      nextVisitTime: data.nextVisitTime ? new Date(data.nextVisitTime) : undefined,
      companyId: 'cmo75yliq0000wesurjpett1n' // Added required companyId
    }
  }))
};
