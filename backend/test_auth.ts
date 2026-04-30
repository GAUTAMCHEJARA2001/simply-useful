import { prisma } from './src/lib/prisma';

async function test() {
  console.log('--- 🧪 [TEST] DATABASE CONNECTIVITY 🧪 ---');
  try {
    await prisma.$connect();
    console.log('✅ Connected to Prisma');
    
    const users = await prisma.user.findMany();
    console.log('✅ Found Users:', users.length);
    console.log('Users:', JSON.stringify(users, null, 2));
    
  } catch (err: any) {
    console.error('❌ [TEST] FAILED');
    console.error('Message:', err.message);
    if (err.stack) console.error('Stack:', err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

test();
