export type UserRole = 'SALES' | 'ADMIN' | 'HR' | 'INVENTORY' | 'SUPERADMIN';

export type OrderStatus = 'Pending' | 'Approved' | 'Dispatched' | 'Completed' | 'Cancelled' | 'Returned';



export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  active: boolean;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

import { Request } from 'express';
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
    companyId?: string | null;
  };
}
