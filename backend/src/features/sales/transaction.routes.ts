import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { sendSuccess } from '../../utils/response';
import { sendApiError } from '../../utils/apiErrorHandler';

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
  try {
    const purchases = await prisma.purchase.findMany({ include: { items: true } });
    sendSuccess(res, purchases, 'Purchases fetched');
  } catch (e: any) {
    sendApiError(req, res, e, { message: 'Purchases fetched' });
  }
});

router.post('/purchases', async (req, res) => {
  // stub
  sendSuccess(res, { id: Date.now(), ...req.body }, 'Purchase recorded');
});

router.put('/purchases/:id', async (req, res) => {
  // stub
  sendSuccess(res, { id: req.params.id, ...req.body }, 'Purchase updated');
});

router.delete('/purchases/:id', async (req, res) => {
  sendSuccess(res, null, 'Purchase deleted');
});

// ✅ Sales (Inventory View)
router.get('/sales', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({ include: { items: { include: { product: true } } } });
    sendSuccess(res, orders, 'Inventory sales fetched');
  } catch (e: any) {
    sendApiError(req, res, e, { message: 'Inventory sales fetched' });
  }
});

router.post('/sales', async (req, res) => {
  sendSuccess(res, { id: Date.now(), ...req.body }, 'Sale recorded');
});

router.put('/sales/:id', async (req, res) => {
  sendSuccess(res, { id: req.params.id, ...req.body }, 'Sale updated');
});

router.delete('/sales/:id', async (req, res) => {
  sendSuccess(res, null, 'Sale deleted');
});

// ✅ Approvals
router.get('/approvals', async (req, res) => {
  try {
    const approvals = await prisma.order.findMany({ where: { status: 'Pending' } });
    sendSuccess(res, approvals, 'Pending approvals fetched');
  } catch (e: any) {
    sendApiError(req, res, e, { message: 'Pending approvals fetched' });
  }
});

router.get('/approvals/:id', async (req, res) => {
  try {
    const approval = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    sendSuccess(res, approval, 'Approval detail fetched');
  } catch (e: any) {
    sendApiError(req, res, e, { fallbackData: null, message: 'Approval detail fetched' });
  }
});

router.post('/approvals/:id/approve', async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'Approved' }
    });
    sendSuccess(res, order, 'Order approved successfully');
  } catch (e: any) {
    sendApiError(req, res, e);
  }
});

router.post('/approvals/:id/reject', async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'Cancelled' }
    });
    sendSuccess(res, order, 'Order rejected successfully');
  } catch (e: any) {
    sendApiError(req, res, e);
  }
});

// ✅ Productions
router.get('/productions', async (req, res) => {
  sendSuccess(res, [], 'Productions fetched');
});

router.post('/productions', async (req, res) => {
  sendSuccess(res, { id: Date.now(), ...req.body }, 'Production recorded');
});

router.get('/productions/:id/materials', async (req, res) => {
  sendSuccess(res, [], 'Production materials fetched');
});

// ✅ Adjustments
router.get('/adjustments', async (req, res) => {
  sendSuccess(res, [], 'Adjustments fetched');
});

router.post('/adjustments', async (req, res) => {
  sendSuccess(res, { id: Date.now(), ...req.body }, 'Adjustment recorded');
});

router.put('/adjustments/:id', async (req, res) => {
  sendSuccess(res, { id: req.params.id, ...req.body }, 'Adjustment updated');
});

router.delete('/adjustments/:id', async (req, res) => {
  sendSuccess(res, null, 'Adjustment deleted');
});

// ✅ Attendance
router.get('/attendance', async (req, res) => {
  sendSuccess(res, [], 'Attendance fetched');
});

router.post('/attendance', async (req, res) => {
  sendSuccess(res, { id: Date.now(), ...req.body }, 'Attendance recorded');
});

router.put('/attendance/:id', async (req, res) => {
  sendSuccess(res, { id: req.params.id, ...req.body }, 'Attendance updated');
});

router.delete('/attendance/:id', async (req, res) => {
  sendSuccess(res, null, 'Attendance deleted');
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
