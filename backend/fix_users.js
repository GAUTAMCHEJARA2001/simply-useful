const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const targetCompanyId = 'cmpwp1h8v0000sscdshw8thbl';
    
    const result = await prisma.user.updateMany({
        where: { companyId: 'cm00000000000000000000000' },
        data: { companyId: targetCompanyId }
    });
    
    console.log(`Updated ${result.count} users to company ${targetCompanyId}`);
}
run().catch(console.error).finally(() => prisma.$disconnect());
