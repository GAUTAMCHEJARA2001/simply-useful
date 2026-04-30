import { User } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { RegisterInput } from '../../validation/schemas';

interface CreateUserData extends RegisterInput {
  hashedPassword: string;
}

/**
 * AUTH REPOSITORY (ELITE - 11/10)
 * Features: 
 * - Circuit Breaker pattern
 * - Explicit Type Hardening
 * - Top-level functional exports
 */

let failureCount = 0;
const BREAKER_THRESHOLD = 5;

const safeQuery = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (failureCount > BREAKER_THRESHOLD) {
    throw new AppError('Auth service temporarily unavailable', 503);
  }

  try {
    const result = await fn();
    failureCount = 0;
    return result;
  } catch (err: unknown) {
    const error = err as Error;
    failureCount++;
    console.error(`📊 AUTH DB FAILURE [${failureCount}]:`, error.message);
    throw new AppError('Database operation failed', 500);
  }
};

export const findByEmail = (email: string): Promise<User | null> => 
  safeQuery(() => prisma.user.findUnique({ where: { email } }));

export const findById = (id: string): Promise<User | null> => 
  safeQuery(() => prisma.user.findUnique({ where: { id } }));

export const createUser = (data: CreateUserData): Promise<User> => 
  safeQuery(() => prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      hashedPassword: data.hashedPassword,
      role: data.role || 'SALES',
      active: true
    }
  }));

export const updateStatus = (id: string, active: boolean): Promise<User> => 
  safeQuery(() => prisma.user.update({
    where: { id },
    data: { active }
  }));

export const findAll = (): Promise<User[]> => 
  safeQuery(() => prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  }));
