import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import env from './config/env';
import { logger } from './config/logger';
import { swaggerSpec } from './config/swagger';
import { observe, httpLogger, metrics } from './middleware/standard';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter, authLimiter } from './middleware/limiters';
import { checkDbHealth } from './lib/prisma';
import prisma from './lib/prisma';

// Route Imports
import authRoutes from './features/auth/auth.routes';
import productRoutes from './features/inventory/product.routes';
import orderRoutes from './features/sales/sale.routes';
import dealerRoutes from './features/dealers/dealer.routes';
import visitRoutes from './features/visits/visit.routes';
import expenseRoutes from './features/expenses/expense.routes';

const app = express();
const API_VERSION = '/api/v1';

// 1. LIFECYCLE: Graceful Shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ msg: 'Unhandled Rejection', reason });
});

// 2. SECURITY & UTILS
app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(httpLogger); // Professional Pino-HTTP Logging
app.use(observe);   // Advanced Telemetry

// 3. DOCUMENTATION (Perfect 10)
if (env.NODE_ENV === 'development') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  logger.info(`📘 Swagger UI available at http://localhost:${env.PORT}/api-docs`);
}

// 4. RATE LIMITING
app.use(API_VERSION, globalLimiter);
app.use(`${API_VERSION}/auth`, authLimiter);

// 5. ELITE ROUTES
app.use(`${API_VERSION}/auth`, authRoutes);
app.use(`${API_VERSION}/products`, productRoutes);
app.use(`${API_VERSION}/sales`, orderRoutes);
app.use(`${API_VERSION}/dealers`, dealerRoutes);
app.use(`${API_VERSION}/visits`, visitRoutes);
app.use(`${API_VERSION}/expenses`, expenseRoutes);

// 6. OBSERVABILITY
app.get('/health', async (_req, res) => {
  const dbStatus = await checkDbHealth();
  res.json({
    success: true,
    data: {
      status: 'ok',
      database: dbStatus,
      uptime: process.uptime(),
      time: new Date().toISOString()
    },
    message: 'System Healthy'
  });
});

app.get('/metrics', (req, res) => {
  if (env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  res.json({
    success: true,
    data: metrics,
    message: 'Current Performance Metrics'
  });
});

// 7. ERROR HANDLING
app.use(errorHandler);

// 8. STARTUP
const PORT = env.PORT;
app.listen(PORT, () => {
  logger.info(`✅ Elite Server running on http://localhost:${PORT}${API_VERSION}`);
});
