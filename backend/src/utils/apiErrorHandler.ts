import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { getPrismaErrorCode, isDbConnectionError } from './prismaErrors';

type ApiErrorOptions = {
  fallbackData?: unknown;
  message?: string;
};

export const classifyApiError = (error: unknown, req?: Request) => {
  const err = error as { message?: string; statusCode?: number; code?: string; meta?: any };
  const code = getPrismaErrorCode(error);
  const method = req?.method?.toUpperCase();

  if (isDbConnectionError(error)) {
    if (method === 'GET') {
      return {
        statusCode: 200,
        success: true,
        data: [],
        message: 'Database temporarily unavailable. Showing empty data.',
      };
    }

    return {
      statusCode: 503,
      success: false,
      data: null,
      message: 'Database temporarily unavailable. Please retry.',
    };
  }

  if (code === 'P2002') {
    return {
      statusCode: 409,
      success: false,
      data: null,
      message: `Duplicate record${err.meta?.target ? `: ${err.meta.target}` : ''}`,
    };
  }

  if (code === 'P2025') {
    return {
      statusCode: 404,
      success: false,
      data: null,
      message: 'Record not found.',
    };
  }

  if (code === 'P2003') {
    return {
      statusCode: 400,
      success: false,
      data: null,
      message: 'Related record is missing or invalid.',
    };
  }

  if (code === 'P2014') {
    return {
      statusCode: 400,
      success: false,
      data: null,
      message: 'This change conflicts with related records.',
    };
  }

  return {
    statusCode: err.statusCode || 500,
    success: false,
    data: null,
    message: err.message || 'Internal Server Error',
  };
};

export const sendApiError = (
  req: Request,
  res: Response,
  error: unknown,
  options: ApiErrorOptions = {}
) => {
  const classified = classifyApiError(error, req);
  const statusCode = classified.statusCode;
  const message = classified.success && options.message ? options.message : classified.message;
  const data = classified.success && options.fallbackData !== undefined
    ? options.fallbackData
    : classified.data;

  const logPayload = {
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode,
    message,
    error: (error as Error)?.message,
    code: (error as { code?: string })?.code,
  };

  if (statusCode >= 500 && !classified.success) {
    logger.error(logPayload);
  } else {
    logger.warn(logPayload);
  }

  return res.status(statusCode).json({
    success: classified.success,
    data,
    message,
    ...(classified.success ? {} : { error: message }),
  });
};
