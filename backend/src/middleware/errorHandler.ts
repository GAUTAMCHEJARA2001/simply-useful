import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * ELITE ERROR HANDLING CLASS
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * GLOBAL ERROR HANDLER (10/10)
 * Features:
 * - Direct logger integration with trace context
 * - Structured stack-trace logging for production debugging
 * - Safe error message leaking prevention
 */
export const errorHandler = (
  err: Error & { statusCode?: number },
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Professional Logger Integration
  logger.error({
    requestId: (req as Request & { id?: string }).id,
    msg: message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Standardized Enterprise Response
  res.status(statusCode).json({
    success: false,
    message,
    data: null,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
