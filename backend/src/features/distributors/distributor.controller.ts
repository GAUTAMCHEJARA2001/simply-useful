import { Request, Response, NextFunction } from 'express';
import * as distributorService from './distributor.service';
import { sendSuccess } from '../../utils/response';

export const getDistributors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await distributorService.getAllDistributors();
    sendSuccess(res, data, 'Distributors fetched successfully');
  } catch (e) {
    next(e);
  }
};

export const createDistributor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await distributorService.createDistributor(req.body);
    sendSuccess(res, data, 'Distributor created successfully', 201);
  } catch (e) {
    next(e);
  }
};

export const updateDistributor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await distributorService.updateDistributor(req.params.name, req.body);
    sendSuccess(res, data, 'Distributor updated successfully');
  } catch (e) {
    next(e);
  }
};

export const deleteDistributor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await distributorService.deleteDistributor(req.params.name);
    sendSuccess(res, data, 'Distributor deleted successfully');
  } catch (e) {
    next(e);
  }
};
