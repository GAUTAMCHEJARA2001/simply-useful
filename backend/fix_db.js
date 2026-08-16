const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function run() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "brand" TEXT, ADD COLUMN IF NOT EXISTS "assignedSoEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Distributor" ADD COLUMN IF NOT EXISTS "brand" TEXT, ADD COLUMN IF NOT EXISTS "assignedSoEmails" TEXT[] DEFAULT ARRAY[]::TEXT[];`);
    console.log("Columns added successfully!");
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
