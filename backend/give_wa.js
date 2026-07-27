const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const warehouses = await prisma.warehouse.findMany({ where: { companyId: 'cmpwp1h8v0000sscdshw8thbl' } });
    if (warehouses.length > 0) {
      const warehouseId = warehouses[0].id;
      const invUsers = await prisma.user.findMany({ where: { role: 'INVENTORY' } });
      let data = [];
      for (const u of invUsers) {
        data.push({ userId: u.id, warehouseId: warehouseId });
      }
      await prisma.userWarehouseAccess.createMany({ data: data });
      console.log(`Gave ${data.length} INVENTORY users access to warehouse ${warehouseId}`);
    }
}
run().catch(console.error).finally(() => prisma.$disconnect());
