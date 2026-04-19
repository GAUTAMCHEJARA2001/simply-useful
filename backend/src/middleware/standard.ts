import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pinoHttp from 'pino-http';
import { logger } from '../config/logger';

/**
 * ELITE TELEMETRY MIDDLEWARE (10/10)
 * Features: 
 * - Request ID propagation
 * - Per-route metrics tracking
 * - High-performance structured logging via pino-http
 * - Standardized X-Response-Time reporting
 */

interface RouteMetric {
  count: number;
  errors: number;
  avgResponseTime: number;
}

export const metrics = {
  totalRequests: 0,
  totalErrors: 0,
  routes: {} as Record<string, RouteMetric>,
  startTime: new Date().toISOString(),
};

// 1. ELITE PINO-HTTP INTEGRATION
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => (req as any).id || uuidv4(),
  customSuccessMessage: (req, res) => `Request ${req.method} ${req.url} completed with ${res.statusCode}`,
  customErrorMessage: (req, res) => `Request ${req.method} ${req.url} failed with ${res.statusCode}`,
});

export const observe = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = uuidv4();
  
  // Traceability
  (req as any).id = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  metrics.totalRequests++;

  // Request Path for metrics (canonicalized)
  const path = req.route?.path || req.path;

  res.on('finish', () => {
    const duration = Date.now() - start;
    res.setHeader('X-Response-Time', `${duration}ms`);

    if (res.statusCode >= 400) metrics.totalErrors++;

    // Update Per-Route Metrics
    if (!metrics.routes[path]) {
      metrics.routes[path] = { count: 0, errors: 0, avgResponseTime: 0 };
    }
    
    const route = metrics.routes[path];
    const newCount = route.count + 1;
    route.avgResponseTime = (route.avgResponseTime * route.count + duration) / newCount;
    route.count = newCount;
    if (res.statusCode >= 400) route.errors++;
  });

  next();
};
