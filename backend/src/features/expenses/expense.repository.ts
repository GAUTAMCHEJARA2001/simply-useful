import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { ExpenseInput } from '../../validation/schemas';

/**
 * EXPENSE REPOSITORY (ELITE)
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
    console.error(`📊 EXPENSE DB FAILURE [${failureCount}]:`, error.message);
    throw new AppError('Database operation failed', 500);
  }
};

export const expenseRepository = {
  findAll: () => safeQuery(() => prisma.expense.findMany({
    orderBy: { createdAt: 'desc' }
  })),

  findByUser: (email: string) => safeQuery(() => prisma.expense.findMany({
    where: { soEmail: email },
    orderBy: { createdAt: 'desc' }
  })),

  create: (data: ExpenseInput) => safeQuery(() => prisma.expense.create({
    data: {
      ...data,
      status: 'Pending',
      companyId: 'cmo75yliq0000wesurjpett1n'
    }
  })),

  updateStatus: (id: string, status: string, rejectReason?: string) => safeQuery(() => prisma.expense.update({
    where: { id },
    data: { status, rejectReason }
  })),

  update: (id: string, data: Partial<ExpenseInput>) => safeQuery(() => prisma.expense.update({
    where: { id },
    data
  }))
};
