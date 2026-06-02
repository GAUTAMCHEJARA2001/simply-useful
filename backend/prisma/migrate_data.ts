/// <reference types="node" />
import { PrismaClient, Product } from '@prisma/client';

interface ProductWithOldFields extends Product {
  category?: string;
  stockQty?: number;
}


const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting data migration...');

  // 1. Ensure "MAIN" Warehouse exists
  console.log('📦 Ensuring "MAIN" warehouse exists...');
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'MAIN',
      active: true,
    },
  });
  console.log(`✅ MAIN Warehouse ready (ID: ${mainWarehouse.id})`);

  // 2. Migrate Categories
  console.log('📂 Migrating category labels to master records...');
  // Extract unique categories (cast to any or use the interface to access 'category')
  const productsWithOld = await prisma.product.findMany() as ProductWithOldFields[];
  const categoryNames = Array.from(new Set(productsWithOld.map(p => p.category).filter(Boolean))) as string[];
  
  // Ensure we have a "General" category if needed
  if (!categoryNames.includes('General')) {
    categoryNames.push('General');
  }

  
  console.log(`Found ${categoryNames.length} unique categories.`);
  
  const categoryMap: Record<string, number> = {};
  
  for (const name of categoryNames) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryMap[name] = category.id;
    console.log(`   - Category [${name}] -> ID ${category.id}`);
  }

  // 3. Update Products and Migrate Stock
  console.log('🔄 Updating products and migrating stock to Inventory table...');
  
  const products = productsWithOld;
  
  for (const p of products) {
    const categoryName = p.category || 'General';
    const categoryId = categoryMap[categoryName];
    
    // Update product with categoryId
    await prisma.product.update({
      where: { id: p.id },
      data: { categoryId: categoryId }
    });
    
    const stockQty = Number(p.stockQty || 0);

    // Create Inventory record for MAIN warehouse
    await prisma.inventory.upsert({
      where: {
        productId_warehouseId: {
          productId: p.id,
          warehouseId: mainWarehouse.id,
        }
      },
      update: {
        quantity: stockQty
      },
      create: {
        productId: p.id,
        warehouseId: mainWarehouse.id,
        quantity: stockQty
      }
    });

    console.log(`   - Product [${p.productCode}] migrated: Stock ${stockQty}, Category [${categoryName}] (ID ${categoryId})`);
  }


  console.log('🏁 Data migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
