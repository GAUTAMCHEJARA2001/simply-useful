import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/response';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await authService.register(req.body);
    sendSuccess(res, data, 'User registered and signed in', 201);
  } catch (e) { next(e); }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const data = await authService.login(password, email);
    sendSuccess(res, data, 'Success login. Session active.');
  } catch (e) { next(e); }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const data = await authService.refreshAccessToken(refreshToken);
    sendSuccess(res, data, 'Session refreshed');
  } catch (e) { next(e); }
};

export const getAllUsers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await authService.getAllUsers();
    sendSuccess(res, users, 'Users retrieved successfully');
  } catch (e) { next(e); }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    const user = await authService.updateUserStatus(id, active);
    sendSuccess(res, user, 'User status updated successfully');
  } catch (e) { next(e); }
};

export const getPermissions = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = ['SALES', 'ADMIN', 'HR', 'INVENTORY', 'SUPERADMIN'];
    sendSuccess(res, roles, 'Roles/Permissions retrieved successfully');
  } catch (e) { next(e); }
};

export const updatePermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isEnabled } = req.body;
    sendSuccess(res, { id, isEnabled }, 'Permission updated successfully');
  } catch (e) { next(e); }
};
