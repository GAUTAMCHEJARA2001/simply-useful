const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Warehouse" DROP CONSTRAINT IF EXISTS "Warehouse_schema_name_key" CASCADE;`);
    console.log('Dropped Warehouse_schema_name_key constraint');
    await prisma.$executeRawUnsafe(`ALTER TABLE "Brand" DROP CONSTRAINT IF EXISTS "Brand_name_companyId_key" CASCADE;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_name_companyId_key" CASCADE;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Labour" DROP CONSTRAINT IF EXISTS "Labour_name_companyId_key" CASCADE;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Region" DROP CONSTRAINT IF EXISTS "Region_name_companyId_key" CASCADE;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Unit" DROP CONSTRAINT IF EXISTS "Unit_name_companyId_key" CASCADE;`);
    console.log('Dropped other potentially blocking constraints');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
