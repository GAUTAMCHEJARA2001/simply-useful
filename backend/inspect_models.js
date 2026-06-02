const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Check fields of supplier and labour
  const s = await p.supplier.findFirst();
  console.log('Sample supplier:', JSON.stringify(s));
  const l = await p.labour.findFirst();
  console.log('Sample labour:', JSON.stringify(l));
  const d = await p.distributor.findFirst();
  console.log('Sample distributor:', JSON.stringify(d));
}
main().catch(console.error).finally(() => p.$disconnect());
