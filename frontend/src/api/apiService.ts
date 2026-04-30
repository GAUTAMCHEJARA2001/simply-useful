/**
 * API Service Facade
 * 
 * This file acts as a bridge to the modular service layer.
 * Using Axios + Centralized Endpoints + Modular Services.
 */

import { authService } from './services/auth.service';
import { userService } from './services/user.service';
import { reportService } from './services/report.service';
import { inventoryService } from './services/inventory.service';
import { orderService } from './services/order.service';
import { partyService } from './services/party.service';
import { expenseService } from './services/expense.service';
import { visitService } from './services/visit.service';
import { settingsService } from './services/settings.service';
import { api } from './client';

export const apiService = {
  auth: authService,
  users: userService,
  reports: reportService,
  inventory: inventoryService,
  orders: orderService,
  parties: partyService,
  expenses: expenseService,
  visits: visitService,
  settings: settingsService,
  
  // Instance for raw access
  api,
};

export default apiService;

// Re-export services for direct named imports
export * from './services/auth.service';
export * from './services/user.service';
export * from './services/report.service';
export * from './services/inventory.service';
export * from './services/order.service';
export * from './services/party.service';
export * from './services/expense.service';
export * from './services/visit.service';
export * from './services/settings.service';
