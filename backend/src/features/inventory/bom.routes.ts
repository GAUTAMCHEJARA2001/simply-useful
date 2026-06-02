import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { sendSuccess } from '../../utils/response';

const router = Router();

/**
 * @swagger
 * /bom:
 *   get:
 *     summary: List all Bill of Materials (BOM)
 *     tags: [Inventory Features]
 */
router.get('/', async (req, res) => {
  const boms = await prisma.bOM.findMany({ include: { items: true } });
  sendSuccess(res, boms, 'BOMs fetched');
});

export default router;
