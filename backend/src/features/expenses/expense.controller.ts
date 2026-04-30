import { Request, Response, NextFunction } from 'express';
import * as expenseService from './expense.service';
import { sendSuccess } from '../../utils/response';

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.query.email as string;
    const data = await expenseService.getExpenses(email);
    sendSuccess(res, data, 'Expenses fetched');
  } catch (e) { next(e); }
};

export const createExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await expenseService.createExpense(req.body);
    sendSuccess(res, data, 'Expense registered', 201);
  } catch (e) { next(e); }
};

export const updateExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = await expenseService.updateExpense(id, req.body);
    sendSuccess(res, data, 'Expense updated');
  } catch (e) { next(e); }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, rejectReason } = req.body;
    const data = await expenseService.updateExpenseStatus(id, status, rejectReason);
    sendSuccess(res, data, `Expense ${status}`);
  } catch (e) { next(e); }
};
