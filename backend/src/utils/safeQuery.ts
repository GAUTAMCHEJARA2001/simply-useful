import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

let failureCount = 0;
const BREAKER_THRESHOLD = 5;

const DB_CONNECTION_ERRORS = [
  "Can't reach database server",
  'connect ECONNREFUSED',
  'Connection refused',
  'P1001', 'P1002', 'P1008', 'P1017',
];

const isDbConnectionError = (err: any): boolean => {
  const msg = (err.message || '') + (err.code || '');
  return DB_CONNECTION_ERRORS.some(e => msg.includes(e));
};

/**
 * GLOBAL SAFE QUERY UTILITY (ELITE)
 * Implements:
 * - Circuit Breaker Pattern
 * - Prisma Safety Layer
 * - Graceful DB connection fallback
 */
export const safeQuery = async <T>(
  repoName: string, 
  fn: () => Promise<T>, 
  fallback?: T
): Promise<T> => {
  if (failureCount > BREAKER_THRESHOLD) {
    logger.warn(`⚠️ CIRCUIT BREAKER [${repoName}]: DB unreachable, returning empty fallback`);
    return (fallback !== undefined ? fallback : [] as unknown as T);
  }

  try {
    const result = await fn();
    failureCount = 0;
    return result;
  } catch (err: any) {
    // 🛡️ GRACEFUL FALLBACK: DB connection errors return empty data, not 500
    if (isDbConnectionError(err)) {
      failureCount++;
      logger.warn(`⚠️ DB UNREACHABLE [${repoName}]: returning empty fallback (failures: ${failureCount})`);
      return (fallback !== undefined ? fallback : [] as unknown as T);
    }

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
