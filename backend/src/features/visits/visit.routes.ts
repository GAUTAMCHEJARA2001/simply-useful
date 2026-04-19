import { Router } from 'express';
import * as visitController from './visit.controller';

const router = Router();

router.get('/', visitController.getVisits);
router.post('/', visitController.createVisit);

export default router;
