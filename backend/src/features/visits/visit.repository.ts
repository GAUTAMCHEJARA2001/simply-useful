import prisma from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

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
  } catch (err: any) {
    failureCount++;
    console.error(`📊 VISIT DB FAILURE [${failureCount}]:`, err.message);
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

  create: (data: any) => safeQuery(() => prisma.visit.create({
    data: {
      soEmail: data.so_email,
      dealerName: data.dealer_name,
      remarks: data.remarks,
      nextFollowup: data.next_followup ? new Date(data.next_followup) : null,
      nextVisitTime: data.next_visit_time ? new Date(data.next_visit_time) : null,
      gpsLocation: data.gps_location,
      photo: data.photo
    }
  }))
};
