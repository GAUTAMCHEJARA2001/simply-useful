const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const invUsers = await prisma.user.findMany({ where: { role: 'INVENTORY' } });
    console.log(`Found ${invUsers.length} INVENTORY users`);
    
    for (const u of invUsers) {
      const wa = await prisma.userWarehouseAccess.findMany({ where: { userId: u.id } });
      const pa = await prisma.userProductAccess.findMany({ where: { userId: u.id } });
      console.log(`User: ${u.email} | Company: ${u.companyId} | WH Access: ${wa.length} | Prod Access: ${pa.length}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
