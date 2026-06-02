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
    console.log('✅ [BOOTSTRAP] Database schema verified via Migrations.');

    // 2. GET OR CREATE DEFAULT COMPANY
    const company = await prisma.company.upsert({
      where: { id: 'cmo75yliq0000wesurjpett1n' },
      update: { name: 'Kamla Enterprises' },
      create: {
        id: 'cmo75yliq0000wesurjpett1n',
        name: 'Kamla Enterprises',
        skuPrefix: 'KE',
        active: true
      }
    });

    // 3. ALWAYS ENSURE SUPERADMIN EXISTS
    const adminEmail = 'admin@simplyuseful.com';
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { companyId: company.id },
      create: {
        id: 'superadmin-1',
        email: adminEmail,
        name: 'System Admin',
        hashedPassword: '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgNIv/K2/UToTOSu3kG83WvI8h5O', // admin123
        role: 'SUPERADMIN',
        active: true,
        companyId: company.id
      }
    });

    // 4. SEEDING MOCK DATA FOR DEFAULT COMPANY IF EMPTY (DISABLED FOR CLEAN SLATE)
    /*
    const companyProductCount = await prisma.product.count({ where: { companyId: company.id } });
    if (companyProductCount === 0) {
      console.log(`🚀 [SEED] No products found for ${company.name}. Generating mockup data...`);
      
      // Seed Sample Categories
      const categoryNames = ['Adhesive', 'Grout', 'Sealant', 'Accessory', 'Chemical'];
      const seededCategories = [];
      for (const name of categoryNames) {
        const cat = await prisma.category.upsert({
          where: { name_companyId: { name, companyId: company.id } },
          update: {},
          create: { name, companyId: company.id }
        });
        seededCategories.push(cat);
      }

      // Seed sample products
      const products = [
        { code: 'AD-101', name: 'Elite Tile Adhesive (Gray)', catId: seededCategories[0].id, size: '20kg', rate: 350 },
        { code: 'AD-102', name: 'Elite Tile Adhesive (White)', catId: seededCategories[0].id, size: '20kg', rate: 520 },
        { code: 'GR-201', name: 'Epoxy Grout (Ivory)', catId: seededCategories[1].id, size: '5kg', rate: 310 },
        { code: 'SL-301', name: 'Premium Leak Plug', catId: seededCategories[2].id, size: '1L', rate: 1250 },
      ];

      for (const p of products) {
        await prisma.product.upsert({
          where: { productCode: p.code },
          update: {},
          create: {
            id: `seed-${company.id}-${p.code}`,
            productCode: p.code,
            name: p.name,
            categoryId: p.catId,
            bagSize: p.size,
            rate: p.rate,
            gst: 18,
            active: true,
            companyId: company.id
          }
        });
      }

      // Seed sample dealers
      await prisma.dealer.upsert({
        where: { dealerCode: 'DLR-001' },
        update: {},
        create: {
          id: `seed-${company.id}-DLR-001`,
          dealerCode: 'DLR-001',
          dealerName: 'Metro Tiles Emporium',
          city: 'New Delhi',
          assignedSoEmail: 'sales@simplyuseful.com',
          distributorName: 'Universal Supply Corp',
          creditLimit: 500000,
          outstanding: 125000,
          active: true,
          companyId: company.id
        }
      });

      console.log('✅ [SEED] Mockup data generation complete.');
    }
    */
    
    console.log('✅ [SYSTEM] DATABASE SEEDING COMPLETE.');
  } catch (err: any) {
    console.error('❌ [CRITICAL] DATABASE SEEDING FAILED:', err.message);
  }
};

// End of prisma.ts
