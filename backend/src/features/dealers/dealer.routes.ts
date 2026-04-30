import { Router } from 'express';
import * as dealerController from './dealer.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Dealers
 *   description: Dealer and Distributor Management
 */

/**
 * @swagger
 * /dealers/distributors:
 *   get:
 *     summary: Get all distributors
 *     tags: [Dealers]
 */
router.get('/distributors', dealerController.getDistributors);

/**
 * @swagger
 * /dealers:
 *   get:
 *     summary: Get all dealers
 *     tags: [Dealers]
 *   post:
 *     summary: Create a new dealer
 *     tags: [Dealers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dealerCode, dealerName, city, assignedSoEmail, distributorName]
 *             properties:
 *               dealerCode: { type: string }
 *               dealerName: { type: string }
 *               city: { type: string }
 *               assignedSoEmail: { type: string, format: email }
 *               distributorName: { type: string }
 *               creditLimit: { type: number }
 */
router.get('/', dealerController.getDealers);
router.post('/', dealerController.createDealer);

/**
 * @swagger
 * /dealers/{code}:
 *   put:
 *     summary: Update dealer by code
 *     tags: [Dealers]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *   delete:
 *     summary: Delete dealer by code
 *     tags: [Dealers]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 */
router.put('/:code', dealerController.updateDealer);
router.delete('/:code', dealerController.deleteDealer);

export default router;
