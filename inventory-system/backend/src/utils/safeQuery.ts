import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

let failureCount = 0;
const BREAKER_THRESHOLD = 5;

/**
 * GLOBAL SAFE QUERY UTILITY (ELITE)
 * Implements:
 * - Circuit Breaker Pattern
 * - Prisma Safety Layer
 * - Standardized Error Logging
 */
export const safeQuery = async <T>(
  repoName: string, 
  fn: () => Promise<T>, 
  fallback?: T
): Promise<T> => {
  if (failureCount > BREAKER_THRESHOLD) {
    logger.error(`🚨 CIRCUIT BREAKER TRIPPED [${repoName}]: SERVICE UNAVAILABLE`);
    throw new AppError(`${repoName} service unavailable (Circuit Breaker)`, 503);
  }

  try {
    const result = await fn();
    failureCount = 0;
    return result;
  } catch (err: any) {
    // 🛡️ PRISMA SAFETY LAYER: Handle "NotFound" as a safe fallback if provided
    if (err.code === 'P2025' && fallback !== undefined) {
      logger.warn(`🛡️ SAFETY LAYER [${repoName}]: Record not found, returning fallback.`);
      return fallback;
    }

    // Pass through AppErrors
    if (err instanceof AppError) throw err;
    
    failureCount++;
    logger.error({
      msg: `📊 DB FAILURE [${repoName}] Count: ${failureCount}`,
      error: err.message,
      code: err.code,
      meta: err.meta
    });
    
    // Throw specialized error for unique constraints
    if (err.code === 'P2002') {
      throw new AppError(`A record with this data already exists (${err.meta?.target || 'unique constraint'})`, 400);
    }

    throw new AppError(err.message || 'Database operation failed', 500);
  }
};
