import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
    console.log('--- TABLES ---');
    console.log(JSON.stringify(tables, null, 2));
    
    const userCount = await prisma.user.count().catch(e => {
        console.log('User table check failed:', e.message);
        return -1;
    });
    console.log('User count:', userCount);
    
    const users = await prisma.user.findMany({ take: 5 });
    console.log('--- SAMPLE USERS ---');
    console.log(JSON.stringify(users, null, 2));
    
  } catch (err: any) {
    console.error('ERROR during DB check:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
