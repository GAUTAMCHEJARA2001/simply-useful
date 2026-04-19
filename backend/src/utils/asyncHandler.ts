import { Request, Response, NextFunction } from 'express';

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

/**
 * Ensures all asynchronous errors are caught and passed to the global error middleware.
 * Prevents the Express server from crashing on unhandled promise rejections.
 */
const asyncHandler = (fn: AsyncHandler) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
