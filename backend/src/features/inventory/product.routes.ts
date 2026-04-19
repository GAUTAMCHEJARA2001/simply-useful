import { Router } from 'express';
import * as productController from './product.controller';
import { protect, authorize } from '../../middleware/auth';

const router = Router();

router.get('/', protect, productController.getAll);
router.post('/', protect, authorize('ADMIN', 'SUPERADMIN', 'INVENTORY'), productController.create);
router.put('/:id', protect, authorize('ADMIN', 'SUPERADMIN', 'INVENTORY'), productController.update);
router.delete('/:id', protect, authorize('ADMIN', 'SUPERADMIN'), productController.remove);

export default router;
