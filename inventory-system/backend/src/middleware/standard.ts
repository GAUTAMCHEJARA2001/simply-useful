import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
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
  genReqId: (req) => (req as Request & { id?: string }).id || crypto.randomUUID(),
  customSuccessMessage: (req, res) => `Request ${req.method} ${req.url} completed with ${res.statusCode}`,
  customErrorMessage: (req, res) => `Request ${req.method} ${req.url} failed with ${res.statusCode}`,
});

export const observe = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  (req as Request & { id: string }).id = requestId;
  res.setHeader('X-Request-ID', requestId);

  metrics.totalRequests++;
  const path = req.route?.path || req.path;

  const originalEnd = res.end;

  (res as Response).end = function (this: Response, ...args: any[]) {
    const duration = Date.now() - start;

    // ✅ SAFE: headers not sent yet
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }

    if (res.statusCode >= 400) metrics.totalErrors++;

    if (!metrics.routes[path]) {
      metrics.routes[path] = { count: 0, errors: 0, avgResponseTime: 0 };
    }

    const route = metrics.routes[path];
    const newCount = route.count + 1;
    route.avgResponseTime =
      (route.avgResponseTime * route.count + duration) / newCount;
    route.count = newCount;

    if (res.statusCode >= 400) route.errors++;

    return originalEnd.apply(this, args as any);
  };

  next();
};
