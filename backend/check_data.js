const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const companies = await prisma.company.findMany();
    console.log('--- Companies ---');
    console.table(companies.map((c) => ({ id: c.id, name: c.name })));

    const users = await prisma.user.findMany({ select: { email: true, companyId: true, role: true } });
    console.log('--- Users ---');
    console.table(users);

    const specificUser = await prisma.user.findUnique({ where: { email: 'admin@simplyuseful.com' } });
    console.log('--- admin@simplyuseful.com ---');
    console.log(specificUser);

    const productCount = await prisma.product.groupBy({
      by: ['companyId'],
      _count: { id: true }
    });
    console.log('--- Product Counts by Company ---');
    console.table(productCount);

    const orderCount = await prisma.order.groupBy({
      by: ['companyId'],
      _count: { id: true }
    });
    console.log('--- Order Counts by Company ---');
    console.table(orderCount);

    const dealerCount = await prisma.dealer.groupBy({
      by: ['companyId'],
      _count: { id: true }
    });
    console.log('--- Dealer Counts by Company ---');
    console.table(dealerCount);

    // Sample data check
    const sampleProduct = await prisma.product.findFirst();
    console.log('--- Sample Product ---');
    console.log(JSON.stringify(sampleProduct, null, 2));

  } catch (error) {
    console.error('Diagnostic Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
