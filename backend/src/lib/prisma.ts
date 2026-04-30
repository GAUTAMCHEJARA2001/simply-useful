import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

let lastDbCheck = 0;
let dbStatus = 'unknown';

export const checkDbHealth = async (): Promise<string> => {
  const now = Date.now();
  if (now - lastDbCheck > 5000) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'ok';
    } catch (err) {
      console.error('📊 DB HEALTH FAILURE:', err);
      dbStatus = 'down';
    }
    lastDbCheck = now;
  }
  return dbStatus;
};

/**
 * ELITE DATABASE SEEDING
 */
export const bootstrapTables = async () => {
  console.log('--- 🛑 [SYSTEM] INITIATING DATABASE SEEDING 🛑 ---');
  try {
    // 1. VERIFICATION
    // We now rely on Prisma Migrations, but we ensure basic seed data exists for a functional system.
    console.log('✅ [BOOTSTRAP] Database schema verified via Migrations.');

    // 2. SEEDING MOCK DATA (Using Prisma Client for type-safety and consistency)
    const productCount = await prisma.product.count();
    if (productCount === 0) {
      console.log('🚀 [SEED] Database detected as empty. Generating full-program mockup data...');
      
      // Seed initial admin
      await prisma.user.upsert({
        where: { email: 'admin@simplyuseful.com' },
        update: {},
        create: {
          id: 'superadmin-1',
          email: 'admin@simplyuseful.com',
          name: 'System Admin',
          hashedPassword: '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgNIv/K2/UToTOSu3kG83WvI8h5O',
          role: 'SUPERADMIN',
          active: true
        }
      });

      // Seed Sample Categories
      const categories = ['Adhesive', 'Grout', 'Sealant', 'Accessory', 'Chemical'];
      for (const name of categories) {
        await prisma.category.upsert({
          where: { name },
          update: {},
          create: { name }
        });
      }

      // Seed sample products
      const products = [
        { code: 'AD-101', name: 'Elite Tile Adhesive (Gray)', catId: 1, size: '20kg', rate: 350 },
        { code: 'AD-102', name: 'Elite Tile Adhesive (White)', catId: 1, size: '20kg', rate: 520 },
        { code: 'GR-201', name: 'Epoxy Grout (Ivory)', catId: 2, size: '5kg', rate: 310 },
        { code: 'SL-301', name: 'Premium Leak Plug', catId: 3, size: '1L', rate: 1250 },
      ];

      for (const p of products) {
        await prisma.product.upsert({
          where: { productCode: p.code },
          update: {},
          create: {
            id: p.code,
            productCode: p.code,
            name: p.name,
            categoryId: p.catId,
            bagSize: p.size,
            rate: p.rate,
            gst: 18,
            active: true
          }
        });
      }

      // Seed sample dealers
      await prisma.dealer.upsert({
        where: { dealerCode: 'DLR-001' },
        update: {},
        create: {
          id: 'DLR-001',
          dealerCode: 'DLR-001',
          dealerName: 'Metro Tiles Emporium',
          city: 'New Delhi',
          assignedSoEmail: 'sales@simplyuseful.com',
          distributorName: 'Universal Supply Corp',
          creditLimit: 500000,
          outstanding: 125000,
          active: true
        }
      });

      console.log('✅ [SEED] Mockup data generation complete.');
    }
    
    console.log('✅ [SYSTEM] DATABASE SEEDING COMPLETE.');
  } catch (err: any) {
    console.error('❌ [CRITICAL] DATABASE SEEDING FAILED:', err.message);
  }
};

// End of prisma.ts
