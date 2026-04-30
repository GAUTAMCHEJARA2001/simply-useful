import app from './app';
import env from './config/env';
import { logger } from './config/logger';
import { prisma, bootstrapTables } from './lib/prisma';

// 1. LIFECYCLE: Graceful Shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ msg: 'Unhandled Rejection', reason });
});

// 8. STARTUP
const PORT = env.PORT;
bootstrapTables().then(() => {
  app.listen(PORT, () => {
    logger.info(`✅ Elite Server running on http://localhost:${PORT}/api/v1`);
    if (env.NODE_ENV === 'development') {
      logger.info(`📘 Swagger UI available at http://localhost:${PORT}/api-docs`);
    }
  });
});
