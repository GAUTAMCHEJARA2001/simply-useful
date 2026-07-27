const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('All Users:');
  for (const u of users) {
    console.log(`- ${u.name} | ${u.email} | ${u.role} | companyId: ${u.companyId}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
