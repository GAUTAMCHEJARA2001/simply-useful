import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllDistributors = async () => {
  return await prisma.distributor.findMany({
    orderBy: { distributorName: 'asc' },
  });
};

export const createDistributor = async (data: any) => {
  return await prisma.distributor.create({
    data,
  });
};

export const updateDistributor = async (name: string, data: any) => {
  return await prisma.distributor.update({
    where: { distributorName: name },
    data,
  });
};

export const deleteDistributor = async (name: string) => {
  return await prisma.distributor.delete({
    where: { distributorName: name },
  });
};
