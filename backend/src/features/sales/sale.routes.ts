import { Router } from 'express';
import * as saleController from './sale.controller';
import { protect, authorize } from '../../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: Sales Order Management
 */

/**
 * @swagger
 * /sales:
 *   get:
 *     summary: Get all sales orders
 *     tags: [Sales]
 *   post:
 *     summary: Create a new sales order
 *     tags: [Sales]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SaleInput'
 *     responses:
 *       201:
 *         description: Sale recorded
 */
router.get('/', protect, saleController.getAll);
router.post('/', protect, authorize('SALES', 'ADMIN', 'SUPERADMIN'), saleController.create);
router.get('/:id', protect, saleController.getById);
router.get('/:id/items', protect, saleController.getItems);
router.put('/:id/status', protect, authorize('ADMIN', 'SUPERADMIN', 'INVENTORY'), saleController.updateStatus);
router.put('/:id/items', protect, authorize('ADMIN', 'SUPERADMIN'), saleController.updateItems);

export default router;
