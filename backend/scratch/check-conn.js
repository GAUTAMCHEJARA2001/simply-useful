const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing connection...');
  try {
    await prisma.$connect();
    console.log('✅ Connection Successful');
    const tables = await prisma.$queryRaw`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`;
    console.log('Tables in database:', tables);
  } catch (e) {
    console.error('❌ Connection Failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
