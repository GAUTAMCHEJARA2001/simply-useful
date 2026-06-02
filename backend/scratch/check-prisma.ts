import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  console.log('Checking prisma properties...');
  const props = Object.keys(prisma);
  console.log('Total properties:', props.length);
  if (props.includes('supplier')) {
    console.log('✅ Found supplier property');
  } else {
    console.log('❌ supplier property NOT found');
    console.log('Available models:', props.filter(p => !p.startsWith('$')));
  }
  process.exit(0);
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
