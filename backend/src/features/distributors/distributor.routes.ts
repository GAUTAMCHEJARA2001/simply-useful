import { Router } from 'express';
import * as distributorController from './distributor.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Distributors
 *   description: Distributor management
 */

router.get('/', distributorController.getDistributors);
router.post('/', distributorController.createDistributor);
router.put('/:name', distributorController.updateDistributor);
router.delete('/:name', distributorController.deleteDistributor);

export default router;
