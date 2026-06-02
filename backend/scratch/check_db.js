
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const companies = await prisma.company.findMany();
    console.log('Companies:', companies);
    
    const users = await prisma.user.findMany();
    console.log('Users:', users.map(u => ({ email: u.email, role: u.role, companyId: u.companyId })));
    
    const categories = await prisma.category.findMany();
    console.log('Categories count:', categories.length);
    
    const products = await prisma.product.findMany();
    console.log('Products count:', products.length);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
