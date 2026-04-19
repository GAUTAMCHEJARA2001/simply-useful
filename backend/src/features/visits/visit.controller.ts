import { Request, Response, NextFunction } from 'express';
import * as visitService from './visit.service';
import { sendSuccess } from '../../utils/response';

export const getVisits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.query.email as string;
    const data = await visitService.getVisits(email);
    sendSuccess(res, data, 'Visits fetched');
  } catch (e) { next(e); }
};

export const createVisit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await visitService.createVisit(req.body);
    sendSuccess(res, data, 'Visit verified and stored', 201);
  } catch (e) { next(e); }
};
