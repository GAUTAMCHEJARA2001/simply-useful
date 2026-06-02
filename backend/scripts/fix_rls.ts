import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting RLS Policy Fixer...');

  const tables = [
    'BOM', 'BOMItem', 'Brand', 'Category', 'Company', 'Dealer', 'Distributor',
    'Expense', 'Inventory', 'Labour', 'Market', 'Order', 'OrderItem', 'Product',
    'Purchase', 'PurchaseItem', 'RefreshToken', 'Region', 'StockBatch',
    'Supplier', 'Unit', 'User', 'UserProductAccess', 'UserWarehouseAccess',
    'Visit', 'Warehouse'
  ];

  for (const table of tables) {
    console.log(`🔧 Fixing policies for table: ${table}`);
    try {
      // Create a broad policy for authenticated users for now
      // This solves the "Unauthorized" access for the application
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = 'Enable all for authenticated users'
          ) THEN
            EXECUTE 'CREATE POLICY "Enable all for authenticated users" ON "public"."' || '${table}' || '" AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true)';
          END IF;
        END $$;
      `);
      
      // Also allow anon to select for public views if needed
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = '${table}' AND policyname = 'Enable read for anon'
          ) THEN
            EXECUTE 'CREATE POLICY "Enable read for anon" ON "public"."' || '${table}' || '" AS PERMISSIVE FOR SELECT TO anon USING (true)';
          END IF;
        END $$;
      `);
      
      console.log(`✅ Table ${table} policies applied.`);
    } catch (err: any) {
      console.error(`❌ Failed to apply policy to ${table}:`, err.message);
    }
  }

  console.log('🏁 RLS Policy Fixer finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
