import { Response } from 'express';
import { logger } from '../config/logger';

/**
 * Standard API Response Format:
 * {
 *   success: boolean,
 *   data: T,
 *   message: string
 * }
 */

export const sendSuccess = <T>(res: Response, data: T | null = null, message = 'Done', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

export const sendError = (res: Response, message = 'Internal Server Error', statusCode = 500, error: unknown = null) => {
  if (error) {
    logger.error({ msg: `[API Error] ${statusCode} - ${message}`, error });
  }

  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
  });
};
