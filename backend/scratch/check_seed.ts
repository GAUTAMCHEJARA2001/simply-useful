import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const models = [
    'user', 'product', 'dealer', 'distributor', 'order', 'visit', 'expense', 
    'unit', 'brand', 'warehouse', 'region', 'market', 'bOM', 'purchase'
  ];

  console.log('--- SEED VERIFICATION REPORT ---');
  for (const model of models) {
    try {
      const count = await (prisma as any)[model].count();
      console.log(`${model.padEnd(15)}: ${count} records`);
    } catch (err: any) {
      console.log(`${model.padEnd(15)}: ERROR - ${err.message}`);
    }
  }
  await prisma.$disconnect();
}

check();
