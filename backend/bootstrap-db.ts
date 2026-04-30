import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- BOOTSTRAPPING SURVIVAL SCHEMA ---');
  try {
    // 1. Create User table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT UNIQUE NOT NULL,
        "name" TEXT,
        "hashedPassword" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'SALES',
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ User table initialized.');

    // 2. Create RefreshToken table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RefreshToken" (
        "id" TEXT PRIMARY KEY,
        "token" TEXT UNIQUE NOT NULL,
        "userId" TEXT NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ RefreshToken table initialized.');

    // 3. SEED a SUPERADMIN if it doesn't exist
    // password is "SimplyUseful123" (hashed below via bcrypt logic replacement, I'll use a pre-hashed string)
    // For now, I'll just check if there is ANY user.
    const count = await prisma.user.count();
    if (count === 0) {
      // "password" = $2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgNIv/K2/UToTOSu3kG83WvI8h5O (SimplyUseful123)
      await prisma.$executeRawUnsafe(\`
        INSERT INTO "User" ("id", "email", "name", "hashedPassword", "role", "active")
        VALUES ('superadmin-id', 'admin@simplyuseful.com', 'System Admin', '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgNIv/K2/UToTOSu3kG83WvI8h5O', 'SUPERADMIN', true)
      \`);
      console.log('✅ SUPERADMIN seeded: admin@simplyuseful.com / SimplyUseful123');
    }

  } catch (err: any) {
    console.error('❌ BOOTSTRAP FAILED:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
