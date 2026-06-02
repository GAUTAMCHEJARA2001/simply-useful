import * as authService from '../features/auth/auth.service';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import { prisma } from '../lib/prisma';

/**
 * AUTH SERVICE UNIT TESTS (11/10 ABSOLUTE PERFECTION)
 * - MOCKED DATA LAYER
 * - NO DATABASE DEPENDENCY
 */

// 1. MOCK PRISMA (Isolation)
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  prisma: {
    refreshToken: {
      create: jest.fn().mockResolvedValue({ id: 'rt123' }),
    },
    user: {
      findUnique: jest.fn(),
    }
  }
}));

describe('Auth Service Professional Hardening (Isolated)', () => {
  const mockUser = { id: 'u123', email: 'test@perfect.com', role: 'ADMIN' };

  test('generateTokens should produce distinct Access and Refresh tokens', async () => {
    const tokens = await authService.generateTokens(mockUser.id, mockUser.email, mockUser.role as any);
    
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    
    // Check that we attempted to store the refresh token
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  test('accessToken should decode correctly with environment secret', async () => {
    const { accessToken } = await authService.generateTokens(mockUser.id, mockUser.email, mockUser.role as any);
    const decoded = jwt.verify(accessToken, env.JWT_SECRET) as any;
    
    expect(decoded.email).toBe(mockUser.email);
    expect(decoded.role).toBe(mockUser.role);
    expect(decoded.userId).toBe(mockUser.id);
  });

  test('refreshToken should have a longer lifespan than accessToken', async () => {
    const { accessToken, refreshToken } = await authService.generateTokens(mockUser.id, mockUser.email, mockUser.role as any);
    const decodedAccess = jwt.decode(accessToken) as any;
    const decodedRefresh = jwt.decode(refreshToken) as any;
    
    const accessTTL = decodedAccess.exp - decodedAccess.iat;
    const refreshTTL = decodedRefresh.exp - decodedRefresh.iat;
    
    expect(refreshTTL).toBeGreaterThan(accessTTL);
  });
});
