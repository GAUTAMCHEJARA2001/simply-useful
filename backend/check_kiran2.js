const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const products = await prisma.product.findMany({ where: { companyId: 'cm00000000000000000000000' }});
    console.log('Total Products in company cm00000000000000000000000:', products.length);
    
    // Check if there are any products for INVENTORY user
    const user = await prisma.user.findUnique({ where: { email: 'kiran@kamla.com' } });
    if (!user) {
        console.log('User not found!');
        return;
    }
    console.log('User:', user.name, 'CompanyId:', user.companyId);

    // Get inventory user products using the logic from product.repository.ts
    const wa = await prisma.userWarehouseAccess.findMany({ where: { userId: user.id } });
    console.log('Warehouse Access count:', wa.length);

    const pa = await prisma.userProductAccess.findMany({ where: { userId: user.id } });
    console.log('Product Access count:', pa.length);
}
run().catch(console.error).finally(() => prisma.$disconnect());
