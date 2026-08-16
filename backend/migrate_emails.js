const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "Dealer" RENAME COLUMN "assignedSoEmail" TO "assignedSoEmails"');
    await prisma.$executeRawUnsafe('ALTER TABLE "Dealer" ALTER COLUMN "assignedSoEmails" TYPE text[] USING ARRAY["assignedSoEmails"]');
    await prisma.$executeRawUnsafe('ALTER TABLE "Distributor" RENAME COLUMN "assignedSoEmail" TO "assignedSoEmails"');
    await prisma.$executeRawUnsafe('ALTER TABLE "Distributor" ALTER COLUMN "assignedSoEmails" TYPE text[] USING ARRAY["assignedSoEmails"]');
    console.log('Migration successful');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
