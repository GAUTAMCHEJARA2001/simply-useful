import prisma from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

/**
 * DEALER REPOSITORY (ELITE)
 */

let failureCount = 0;
const BREAKER_THRESHOLD = 5;

const safeQuery = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (failureCount > BREAKER_THRESHOLD) {
    throw new AppError('Dealer service unavailable', 503);
  }

  try {
    const result = await fn();
    failureCount = 0;
    return result;
  } catch (err: any) {
    failureCount++;
    console.error(`📊 DEALER DB FAILURE [${failureCount}]:`, err.message);
    throw new AppError('Database operation failed', 500);
  }
};

export const dealerRepository = {
  findAll: () => safeQuery(() => prisma.dealer.findMany({
    orderBy: { dealerName: 'asc' }
  })),

  findByCode: (dealerCode: string) => safeQuery(() => prisma.dealer.findUnique({
    where: { dealerCode }
  })),

  create: (data: any) => safeQuery(() => prisma.dealer.create({
    data
  })),

  update: (dealerCode: string, data: any) => safeQuery(() => prisma.dealer.update({
    where: { dealerCode },
    data
  })),

  delete: (dealerCode: string) => safeQuery(() => prisma.dealer.delete({
    where: { dealerCode }
  }))
};
