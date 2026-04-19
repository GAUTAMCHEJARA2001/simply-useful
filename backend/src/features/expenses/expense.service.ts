import { expenseRepository } from './expense.repository';

export const getExpenses = async (userEmail?: string) => {
  if (userEmail) return expenseRepository.findByUser(userEmail);
  return expenseRepository.findAll();
};

export const createExpense = async (data: any) => {
  return expenseRepository.create(data);
};

export const updateExpenseStatus = async (id: string, status: string, rejectReason?: string) => {
  return expenseRepository.updateStatus(id, status, rejectReason);
};

export const updateExpense = async (id: string, data: any) => {
  return expenseRepository.update(id, data);
};
