import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import env from './config/env';
import { httpLogger, observe } from './middleware/standard';
import { globalLimiter, authLimiter } from './middleware/limiters';
import { errorHandler } from './middleware/errorHandler';
import { healApiRoute } from './middleware/routeHealing';
import { swaggerSpec } from './config/swagger';

// Route Imports
import authRoutes from './features/auth/auth.routes';
import productRoutes from './features/inventory/product.routes';
import orderRoutes from './features/sales/sale.routes';
import dealerRoutes from './features/dealers/dealer.routes';
import visitRoutes from './features/visits/visit.routes';
import expenseRoutes from './features/expenses/expense.routes';
import { metrics } from './middleware/standard';
import { checkDbHealth } from './lib/prisma';
import masterRoutes from './features/masters/master.routes';
import reportRoutes from './features/inventory/report.routes';
import bomRoutes from './features/inventory/bom.routes';
import userRoutes from './features/auth/user.routes';
import transactionRoutes from './features/sales/transaction.routes';
import distributorRoutes from './features/distributors/distributor.routes';


const app = express();
const API_VERSION = '/api/v1';

// 2. SECURITY & UTILS
app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(healApiRoute);
app.use(httpLogger); // Professional Pino-HTTP Logging
app.use(observe);   // Advanced Telemetry

if (env.NODE_ENV === 'development') {
  const autoAuthScript = `
    window.onload = function() {
      const observer = new MutationObserver(() => {
        if (window.ui) {
          observer.disconnect();
          const originalFetch = window.fetch;
          window.fetch = async (...args) => {
            const res = await originalFetch(...args);
            if (args[0].includes('/auth/login') && res.ok) {
              const clone = res.clone();
              const json = await clone.json();
              if (json.success && json.data.accessToken) {
                window.ui.authActions.authorize({
                  bearerAuth: {
                    name: 'bearerAuth',
                    schema: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                    value: json.data.accessToken
                  }
                });
                console.log('🚀 [Simply Useful] Auto-Authorized Successfully!');
              }
            }
            return res;
          };
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    };
  `;

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      deepLinking: true,
      displayOperationId: true,
      defaultModelsExpandDepth: -1,
      persistAuthorization: true,
      docExpansion: 'list', // Expand by default for better visibility
      filter: true
    },
    customJsContent: autoAuthScript,
    customSiteTitle: 'Simply Useful Elite ERP API Docs'
  } as any));
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
app.use(`${API_VERSION}/masters`, masterRoutes);

app.use(`${API_VERSION}/reports`, reportRoutes);              // Consolidated

app.use(`${API_VERSION}/bom`, bomRoutes);
app.use(`${API_VERSION}/distributors`, distributorRoutes);
app.use(`${API_VERSION}/transactions`, transactionRoutes);
app.use(`${API_VERSION}/users`, userRoutes);                  // User CRUD (pagination + search)

 
// 5.5 ROOT API ROUTE
app.get(API_VERSION, (_req, res) => {
  res.json({
    success: true,
    message: 'Simply Useful API v1',
    version: '1.0.0'
  });
});

// 6. OBSERVABILITY
app.get(`${API_VERSION}/health`, async (_req, res) => {
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

app.get(`${API_VERSION}/metrics`, (req, res) => {
  if (env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  res.json({
    success: true,
    data: metrics,
    message: 'Current Performance Metrics'
  });
});

// 6.5 CATCH-ALL 404 HANDLER
app.use((req, res, next) => {
  if (!res.headersSent) {
    res.status(404).json({
      success: false,
      data: null,
      error: 'Route not found',
      message: `Route ${req.method} ${req.originalUrl} not found`
    });
  }
});

// 7. ERROR HANDLING
app.use(errorHandler);

export default app;
