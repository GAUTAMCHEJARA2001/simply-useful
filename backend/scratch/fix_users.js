
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUsers() {
  try {
    const company = await prisma.company.findFirst();
    if (!company) {
      console.log('No company found to assign users to.');
      return;
    }
    
    console.log(`Assigning all users to company: ${company.name} (${company.id})`);
    
    const result = await prisma.user.updateMany({
      where: { companyId: null },
      data: { companyId: company.id }
    });
    
    console.log(`Updated ${result.count} users.`);
    
    // Also ensure categories and products are linked if they are not
    const cats = await prisma.category.updateMany({
      where: { companyId: '' },
      data: { companyId: company.id }
    });
    console.log(`Updated ${cats.count} categories.`);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

fixUsers();
