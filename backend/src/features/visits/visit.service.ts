import { visitRepository } from './visit.repository';

export const getVisits = async (userEmail?: string) => {
  if (userEmail) return visitRepository.findByUser(userEmail);
  return visitRepository.findAll();
};

export const createVisit = async (data: any) => {
  return visitRepository.create(data);
};
