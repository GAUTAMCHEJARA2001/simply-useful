import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { ExpenseInput } from '../../validation/schemas';

/**
 * EXPENSE REPOSITORY (ELITE)
 */

let failureCount = 0;
const BREAKER_THRESHOLD = 5;

const safeQuery = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (failureCount > BREAKER_THRESHOLD) {
    throw new AppError('Expense service unavailable', 503);
  }

  try {
    const result = await fn();
    failureCount = 0;
    return result;
  } catch (err: unknown) {
    const error = err as Error;
    failureCount++;
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
      status: 'Pending'
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
