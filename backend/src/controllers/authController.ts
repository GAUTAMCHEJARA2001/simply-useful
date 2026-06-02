import { Request, Response } from 'express';
import * as authService from '../services/authService';
import asyncHandler from '../utils/asyncHandler';
import { registerSchema, loginSchema } from '../validation/schemas';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = registerSchema.parse(req.body);
  const user = await authService.registerUser(validatedData);
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: { user },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = loginSchema.parse(req.body);
  const result = await authService.loginUser(validatedData);
  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: result,
  });
});
