
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const categories = await prisma.category.findMany({
      include: { children: true }
    });
    console.log('Categories Detail:', categories.map(c => ({ 
      id: c.id, 
      name: c.name, 
      parentId: c.parentId, 
      children: c.children.map(ch => ch.name) 
    })));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
