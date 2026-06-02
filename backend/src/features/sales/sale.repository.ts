import { orderRepository } from './order.repository';

/**
 * Legacy compatibility wrapper.
 * Sales are stored as Orders + OrderItems in the current Prisma schema.
 */
export const saleRepository = {
  findAll: () => orderRepository.findAll(),
  findById: (id: string) => orderRepository.findById(id),
  create: (data: any) => orderRepository.create(data),
};
