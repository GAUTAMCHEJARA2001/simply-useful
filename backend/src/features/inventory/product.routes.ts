import { Router } from 'express';
import * as productController from './product.controller';
import { protect, authorize } from '../../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Inventory and Product Master Management
 */

/**
 * @swagger
 * /products/subcategories:
 *   get:
 *     summary: Get all product subcategories (categories)
 *     tags: [Products]
 */
router.get('/subcategories', protect, productController.getSubCategories);

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       201:
 *         description: Product created
 */
router.get('/', protect, productController.getAll);
router.post('/', protect, authorize('ADMIN', 'SUPERADMIN', 'INVENTORY'), productController.create);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update an existing product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:id', protect, productController.getById);
router.put('/:id', protect, authorize('ADMIN', 'SUPERADMIN', 'INVENTORY'), productController.update);
router.delete('/:id', protect, authorize('ADMIN', 'SUPERADMIN'), productController.remove);

export default router;
