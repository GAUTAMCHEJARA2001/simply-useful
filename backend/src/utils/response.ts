import { Response } from 'express';

/**
 * Standard API Response Format:
 * {
 *   success: boolean,
 *   data: any,
 *   message: string
 * }
 */

export const sendSuccess = (res: Response, data: any = null, message = 'Done', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

export const sendError = (res: Response, message = 'Internal Server Error', statusCode = 500, error: any = null) => {
  if (error) {
    console.error(`[API Error] ${statusCode} - ${message}`, error);
  }

  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
  });
};
