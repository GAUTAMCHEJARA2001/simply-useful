import { Router } from 'express';
import * as saleController from '../controllers/saleController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.get('/', protect, saleController.getAll);
router.post('/', protect, authorize('SALES', 'ADMIN', 'SUPERADMIN'), saleController.create);

export default router;
