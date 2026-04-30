import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { sendSuccess } from '../../utils/response';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Purchase and Inventory Transactions
 */

/**
 * @swagger
 * /transactions/purchases:
 *   get:
 *     summary: List all purchase orders
 *     tags: [Transactions]
 */
router.get('/purchases', async (req, res) => {
  const purchases = await prisma.purchase.findMany({ include: { items: true } });
  sendSuccess(res, purchases, 'Purchases fetched');
});

router.post('/purchases', async (req, res) => {
  // stub
  sendSuccess(res, { id: Date.now(), ...req.body }, 'Purchase recorded');
});

router.put('/purchases/:id', async (req, res) => {
  // stub
  sendSuccess(res, { id: req.params.id, ...req.body }, 'Purchase updated');
});

// ✅ Sales (Inventory View)
router.get('/sales', async (req, res) => {
  const orders = await prisma.order.findMany({ include: { items: { include: { product: true } } } });
  sendSuccess(res, orders, 'Inventory sales fetched');
});

// ✅ Approvals
router.get('/approvals', async (req, res) => {
  const approvals = await prisma.order.findMany({ where: { status: 'Pending' } });
  sendSuccess(res, approvals, 'Pending approvals fetched');
});

router.get('/approvals/:id', async (req, res) => {
  const approval = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
  sendSuccess(res, approval, 'Approval detail fetched');
});

router.post('/approvals/:id/approve', async (req, res) => {
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: 'Approved' }
  });
  sendSuccess(res, order, 'Order approved successfully');
});

// ✅ Productions
router.get('/productions', async (req, res) => {
  sendSuccess(res, [], 'Productions fetched');
});

router.get('/productions/:id/materials', async (req, res) => {
  sendSuccess(res, [], 'Production materials fetched');
});

// ✅ Adjustments
router.get('/adjustments', async (req, res) => {
  sendSuccess(res, [], 'Adjustments fetched');
});

// ✅ Attendance
router.get('/attendance', async (req, res) => {
  sendSuccess(res, [], 'Attendance fetched');
});

// ✅ Returns
router.get('/returns', async (req, res) => {
  sendSuccess(res, [], 'Returns fetched');
});

// ✅ Purchase Orders
router.get('/purchase-orders', async (req, res) => {
  sendSuccess(res, [], 'Purchase orders fetched');
});

router.get('/purchase-orders/:id/items', async (req, res) => {
  sendSuccess(res, [], 'Purchase order items fetched');
});



export default router;
