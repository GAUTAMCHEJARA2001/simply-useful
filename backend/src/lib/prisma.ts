import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let lastDbCheck = 0;
let dbStatus = 'unknown';

/**
 * CACHED DB HEALTH CHECK
 * Prevents DB overload during rapid health polling.
 */
export const checkDbHealth = async (): Promise<string> => {
  const now = Date.now();
  // Cache result for 5 seconds
  if (now - lastDbCheck > 5000) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'ok';
    } catch (err) {
      console.error('📊 DB HEALTH FAILURE:', err);
      dbStatus = 'down';
    }
    lastDbCheck = now;
  }
  return dbStatus;
};

export default prisma;
