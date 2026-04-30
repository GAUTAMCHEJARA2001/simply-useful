import { Router } from 'express';
import * as visitController from './visit.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Visits
 *   description: Field Visit Tracking
 */

/**
 * @swagger
 * /visits:
 *   get:
 *     summary: Get all field visits
 *     tags: [Visits]
 *   post:
 *     summary: Track a new field visit
 *     tags: [Visits]
 */
router.get('/', visitController.getVisits);
router.post('/', visitController.createVisit);

export default router;
