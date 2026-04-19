import { Router } from 'express';
import * as expenseController from './expense.controller';

const router = Router();

router.get('/', expenseController.getExpenses);
router.post('/', expenseController.createExpense);
router.put('/:id/status', expenseController.updateStatus);

export default router;
