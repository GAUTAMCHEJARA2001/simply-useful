import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import env from '../../config/env';
import * as authRepository from './auth.repository';
import { AppError } from '../../middleware/errorHandler';
import prisma from '../../lib/prisma';

/**
 * ELITE AUTH SERVICE (11/10 ABSOLUTE PERFECTION)
 * Features:
 * - Dual-Token System (Access + Refresh)
 * - Secure Session Rotation
 * - Revocable tokens
 */

export const generateTokens = async (userId: string, email: string, role: string) => {
  const accessToken = jwt.sign(
    { userId, email, role },
    env.JWT_SECRET,
    { expiresIn: '15m' } // Short-lived
  );

  const refreshToken = jwt.sign(
    { userId },
    env.JWT_SECRET,
    { expiresIn: '7d' } // Long-lived
  );

  // Store refresh token in DB
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
  });

  return { accessToken, refreshToken };
};

export const register = async (data: any) => {
  const existing = await authRepository.findByEmail(data.email);
  if (existing) throw new AppError('User already exists', 400);

  const hashedPassword = await bcrypt.hash(data.password, 12);
  const user = await authRepository.createUser({
    ...data,
    hashedPassword,
  });

  const { accessToken, refreshToken } = await generateTokens(user.id, user.email, user.role);
  return { user, accessToken, refreshToken };
};

export const login = async (password: string, email: string) => {
  const user = await authRepository.findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.hashedPassword))) {
    throw new AppError('Invalid credentials', 401);
  }

  const { accessToken, refreshToken } = await generateTokens(user.id, user.email, user.role);
  return { user, accessToken, refreshToken };
};

export const refreshAccessToken = async (oldRefreshToken: string) => {
  try {
    const payload = jwt.verify(oldRefreshToken, env.JWT_SECRET) as any;
    
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken }
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // Revoke old token (Rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true }
    });

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new AppError('User not found', 401);

    return await generateTokens(user.id, user.email, user.role);
  } catch (e) {
    throw new AppError('Session expired. Please login again.', 401);
  }
};
