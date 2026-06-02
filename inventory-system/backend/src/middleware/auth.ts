import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, AuthRequest } from '../types';
import env from '../config/env';
import { logger } from '../config/logger';

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        env.JWT_SECRET
      ) as { userId: string; email: string; role: UserRole; companyId?: string | null };

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        companyId: decoded.companyId,
      };

      return next();
    } catch (error) {
      logger.error({ msg: 'Auth token verification failed', error });
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Not authorized, token failed',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'Not authorized, no token',
    });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: `Role ${req.user?.role} is not authorized to access this route`,
      });
    }
    next();
  };
};
