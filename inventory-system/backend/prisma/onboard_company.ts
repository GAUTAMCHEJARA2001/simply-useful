import { PrismaClient, UserRole } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function onboard(companyName: string, adminEmail: string, skuPrefix: string) {
  console.log(`🏢 Onboarding Company: ${companyName}...`);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Company
      const company = await tx.company.upsert({
        where: { name: companyName },
        update: {},
        create: {
          name: companyName,
          skuPrefix: skuPrefix,
          active: true,
        },
      });

      // 2. Create Super Admin
      const hashedPassword = await bcryptjs.hash('admin123', 10);
      const user = await tx.user.upsert({
        where: { email: adminEmail },
        update: {
          role: UserRole.SUPERADMIN,
          companyId: company.id,
          active: true
        },
        create: {
          email: adminEmail,
          name: `${companyName} Admin`,
          hashedPassword: hashedPassword,
          role: UserRole.SUPERADMIN,
          companyId: company.id,
          active: true,
        },
      });

      return { company, user };
    });

    console.log('✅ ONBOARDING SUCCESSFUL');
    console.log(`   Tenant ID: ${result.company.id}`);
    console.log(`   Admin Login: ${result.user.email}`);
    console.log(`   Initial Pass: admin123`);

  } catch (error) {
    console.error('❌ ONBOARDING FAILED:', error);
  }
}

// Get arguments from command line
const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Usage: npx ts-node onboard_company.ts "Company Name" "admin@email.com" "SKUPREFIX"');
  process.exit(1);
}

onboard(args[0], args[1], args[2])
  .finally(() => prisma.$disconnect());
