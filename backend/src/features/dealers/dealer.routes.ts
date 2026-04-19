import { Router } from 'express';
import * as dealerController from './dealer.controller';

const router = Router();

router.get('/', dealerController.getDealers);
router.post('/', dealerController.createDealer);
router.put('/:code', dealerController.updateDealer);
router.delete('/:code', dealerController.deleteDealer);

export default router;
