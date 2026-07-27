const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const invUsers = await prisma.user.findMany({
      where: { role: 'INVENTORY' }
    });
    
    for (const u of invUsers) {
      const wa = await prisma.userWarehouseAccess.findMany({ where: { userId: u.id }});
      console.log(`${u.name} (${u.email}) - Warehouse Access count: ${wa.length}`);
    }
}
run().catch(console.error).finally(() => prisma.$disconnect());
