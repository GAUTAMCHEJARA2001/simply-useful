import { dealerRepository } from './dealer.repository';
import { DealerInput } from '../../validation/schemas';
import { AppError } from '../../middleware/errorHandler';

export const getAllDealers = async () => dealerRepository.findAll();
export const getDealerByCode = async (code: string) => {
  const dealer = await dealerRepository.findByCode(code);
  if (!dealer) throw new AppError('Dealer not found', 404);
  return dealer;
};
export const createDealer = async (data: DealerInput) => dealerRepository.create(data);
export const updateDealer = async (code: string, data: Partial<DealerInput>) => dealerRepository.update(code, data);
export const deleteDealer = async (code: string) => dealerRepository.delete(code);
