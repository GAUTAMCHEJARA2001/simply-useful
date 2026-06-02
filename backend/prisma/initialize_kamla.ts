import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚮 Starting Multi-Company System Initialization...');

  try {
    // 1. CREATE DEFAULT COMPANY
    console.log('🏢 Creating default company: Kamla Enterprises...');
    const company = await prisma.company.upsert({
      where: { name: 'Kamla Enterprises' },
      update: {},
      create: {
        name: 'Kamla Enterprises',
        skuPrefix: 'KMLA',
        active: true,
      },
    });
    console.log(`✅ Company created: ${company.name} (ID: ${company.id})`);

    // 2. CREATE SUPER ADMIN
    console.log('👤 Creating specialized Super Admin account...');
    const hashedPassword = await bcryptjs.hash('admin123', 10);
    const superAdmin = await prisma.user.create({
      data: {
        email: 'super@kamla.com',
        name: 'Kamla Super Admin',
        hashedPassword: hashedPassword,
        role: 'SUPERADMIN',
        active: true,
        companyId: company.id, // Assigning to the default company
      },
    });
    console.log(`✅ Super Admin created: ${superAdmin.email}`);

    // 3. MINIMUM REQUIRED DATA (WAREHOUSE)
    console.log('🏗️ Bootstrapping required master data...');
    const warehouse = await prisma.warehouse.upsert({
      where: { name_companyId: { name: 'MAIN', companyId: company.id } },
      update: {},
      create: {
        name: 'MAIN',
        active: true,
        companyId: company.id,
      },
    });
    console.log(`✅ MAIN Warehouse ready for ${company.name}`);

    console.log('🏁 SYSTEM INITIALIZED FOR FRESH DATA ENTRY.');
    console.log(`   Company: ${company.name}`);
    console.log('   User: super@kamla.com');
    console.log('   Pass: admin123');

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
