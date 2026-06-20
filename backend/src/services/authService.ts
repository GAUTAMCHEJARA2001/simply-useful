import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types';

const prisma = new PrismaClient();

export const generateToken = (id: string, email: string, role: UserRole) => {
  return jwt.sign(
    { id, email, role },
    process.env.JWT_SECRET || 'simply-useful-secret-key-123',
    { expiresIn: '7d' }
  );
};

export const registerUser = async (data: any) => {
  const { email, password, name, role } = data;

  const userExists = await prisma.user.findUnique({
    where: { email },
  });

  if (userExists) {
    throw new Error('User already exists');
  }

  const hashedPassword = await bcryptjs.hash(password, 10);

  return prisma.user.create({
    data: {
      email,
      hashedPassword,
      name,
      role: role,
      companyId: 'cmo75yliq0000wesurjpett1n' // Added required companyId
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
    },
  });
};

export const loginUser = async (data: any) => {
  const { email, password } = data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !(await bcryptjs.compare(password, user.hashedPassword))) {
    throw new Error('Invalid email or password');
  }

  if (!user.active) {
    throw new Error('User account is deactivated');
  }

  const token = generateToken(user.id, user.email, user.role as UserRole);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
    },
    token,
  };
};
