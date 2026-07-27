const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const user = await prisma.user.findUnique({ where: { email: 'kiran@kamla.com' } });
    const warehouseAccess = await prisma.userWarehouseAccess.findMany({ where: { userId: user.id } });
    const warehouseIds = warehouseAccess.map(wa => wa.warehouseId);

    console.log('Warehouse IDs:', warehouseIds);

    const stockAggregation = await prisma.inventory.groupBy({
      by: ['productId'],
      where: {
        warehouseId: { in: warehouseIds },
        product: { companyId: user.companyId }
      },
      _sum: { quantity: true }
    });

    console.log('Stock aggregation results count:', stockAggregation.length);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
