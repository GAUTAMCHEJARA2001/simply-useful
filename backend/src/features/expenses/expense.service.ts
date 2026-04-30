import { expenseRepository } from './expense.repository';
import { ExpenseInput } from '../../validation/schemas';

export const getExpenses = async (userEmail?: string) => {
  if (userEmail) return expenseRepository.findByUser(userEmail);
  return expenseRepository.findAll();
};

export const createExpense = async (data: ExpenseInput) => {
  return expenseRepository.create(data);
};

export const updateExpenseStatus = async (id: string, status: string, rejectReason?: string) => {
  return expenseRepository.updateStatus(id, status, rejectReason);
};

export const updateExpense = async (id: string, data: Partial<ExpenseInput>) => {
  return expenseRepository.update(id, data);
};
