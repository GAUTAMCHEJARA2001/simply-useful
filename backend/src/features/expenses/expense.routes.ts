import { Router } from 'express';
import * as expenseController from './expense.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Expenses
 *   description: Field Expense Management and Approval
 */

/**
 * @swagger
 * /expenses:
 *   get:
 *     summary: Get all expenses
 *     tags: [Expenses]
 *   post:
 *     summary: Submit a new expense
 *     tags: [Expenses]
 * /expenses/{id}/status:
 *   put:
 *     summary: Update expense status (Approve/Reject)
 *     tags: [Expenses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/', expenseController.getExpenses);
router.post('/', expenseController.createExpense);
router.put('/:id', expenseController.updateExpense);
router.put('/:id/status', expenseController.updateStatus);

export default router;
