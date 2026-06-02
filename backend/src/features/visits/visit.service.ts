import { visitRepository } from './visit.repository';
import { VisitInput } from '../../validation/schemas';

export const getVisits = async (userEmail?: string) => {
  if (userEmail) return visitRepository.findByUser(userEmail);
  return visitRepository.findAll();
};

export const createVisit = async (data: VisitInput) => {
  return visitRepository.create(data);
};
