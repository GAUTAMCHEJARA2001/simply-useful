const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const products1 = await prisma.product.count({ where: { companyId: 'cm00000000000000000000000' }});
    console.log('Total Products in company cm00000000000000000000000:', products1);
    
    const products2 = await prisma.product.count({ where: { companyId: 'cmpwp1h8v0000sscdshw8thbl' }});
    console.log('Total Products in company cmpwp1h8v0000sscdshw8thbl:', products2);
}
run().catch(console.error).finally(() => prisma.$disconnect());
