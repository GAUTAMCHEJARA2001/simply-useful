import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debug() {
  const visit = await prisma.visit.findFirst();
  const expense = await prisma.expense.findFirst();
  const order = await prisma.order.findFirst({ include: { items: true } });

  console.log('--- VISIT DETAIL ---');
  console.log(JSON.stringify(visit, null, 2));
  console.log('\n--- EXPENSE DETAIL ---');
  console.log(JSON.stringify(expense, null, 2));
  console.log('\n--- ORDER DETAIL ---');
  console.log(JSON.stringify(order, null, 2));

  await prisma.$disconnect();
}

debug();
