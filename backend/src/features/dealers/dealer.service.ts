import { dealerRepository } from './dealer.repository';
import { AppError } from '../../middleware/errorHandler';

export const getAllDealers = async () => dealerRepository.findAll();
export const getDealerByCode = async (code: string) => {
  const dealer = await dealerRepository.findByCode(code);
  if (!dealer) throw new AppError('Dealer not found', 404);
  return dealer;
};
export const createDealer = async (data: any) => dealerRepository.create(data);
export const updateDealer = async (code: string, data: any) => dealerRepository.update(code, data);
export const deleteDealer = async (code: string) => dealerRepository.delete(code);
