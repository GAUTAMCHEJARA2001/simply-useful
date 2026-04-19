import { Request, Response, NextFunction } from 'express';
import * as dealerService from './dealer.service';
import { sendSuccess } from '../../utils/response';

export const getDealers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await dealerService.getAllDealers();
    sendSuccess(res, data, 'Dealers fetched');
  } catch (e) { next(e); }
};

export const createDealer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await dealerService.createDealer(req.body);
    sendSuccess(res, data, 'Dealer created', 201);
  } catch (e) { next(e); }
};

export const updateDealer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await dealerService.updateDealer(req.params.code, req.body);
    sendSuccess(res, data, 'Dealer updated');
  } catch (e) { next(e); }
};

export const deleteDealer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await dealerService.deleteDealer(req.params.code);
    sendSuccess(res, data, 'Dealer removed');
  } catch (e) { next(e); }
};
