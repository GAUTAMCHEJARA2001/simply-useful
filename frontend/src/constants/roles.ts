
export const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  HR: 'HR',
  INVENTORY: 'INVENTORY',
  SALES: 'SALES',
  PRODUCTION: 'PRODUCTION',
} as const;

export type Role = keyof typeof ROLES;

export const INVENTORY_ROLES: Role[] = [
  'SUPERADMIN',
  'ADMIN',
  'INVENTORY',
];
