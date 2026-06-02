import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { classifyApiError } from '../utils/apiErrorHandler';

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

export const errorHandler = (
  err: Error & { statusCode?: number },
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const classified = classifyApiError(err, req);
  const logPayload = {
    requestId: (req as Request & { id?: string }).id,
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode: classified.statusCode,
    message: classified.message,
    stack: err.stack,
  };

  if (classified.statusCode >= 500 && !classified.success) logger.error(logPayload);
  else logger.warn(logPayload);

  return res.status(classified.statusCode).json({
    success: classified.success,
    data: classified.data,
    message: classified.message,
    ...(classified.success ? {} : { error: classified.message }),
    ...(process.env.NODE_ENV === 'development' && !classified.success && { stack: err.stack }),
  });
};
