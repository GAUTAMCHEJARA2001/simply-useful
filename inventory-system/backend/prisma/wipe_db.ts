import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 [ERASE] Starting full database wipe for Real Data transition...');

  try {
    // 1. Transactional & Connected Records (Must go first)
    console.log('   - Clearing Transactions & Links...');
    await prisma.orderItem.deleteMany({});
    await prisma.purchaseItem.deleteMany({});
    await prisma.bOMItem.deleteMany({});
    
    await prisma.order.deleteMany({});
    await prisma.purchase.deleteMany({});
    await prisma.bOM.deleteMany({});
    await prisma.visit.deleteMany({});
    await prisma.expense.deleteMany({});
    
    console.log('   - Clearing Marketplace & Access...');
    await prisma.market.deleteMany({});
    await prisma.userProductAccess.deleteMany({});
    await prisma.userWarehouseAccess.deleteMany({});

    console.log('   - Clearing Core Master Data...');
    await prisma.inventory.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.dealer.deleteMany({});
    await prisma.distributor.deleteMany({});
    
    console.log('   - Clearing Infrastructure Data...');
    await prisma.warehouse.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.brand.deleteMany({});
    await prisma.unit.deleteMany({});
    await prisma.region.deleteMany({});

    console.log('   - Clearing Auth & Users...');
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.company.deleteMany({});

    console.log('✅ [SUCCESS] All data wiped. System is now empty.');
    console.log('👉 Next Step: Run npx ts-node prisma/initialize_kamla.ts to create your real Admin.');

  } catch (error) {
    console.error('❌ [ERROR] Wipe failed:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
