import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { VisitInput } from '../../validation/schemas';

/**
 * VISIT REPOSITORY (ELITE)
 */

let failureCount = 0;
const BREAKER_THRESHOLD = 5;

const safeQuery = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (failureCount > BREAKER_THRESHOLD) {
    throw new AppError('Visit service unavailable', 503);
  }

  try {
    const result = await fn();
    failureCount = 0;
    return result;
  } catch (err: unknown) {
    const error = err as Error;
    failureCount++;
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
    }
  }))
};
