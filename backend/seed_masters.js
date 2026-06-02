const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ALPHA_COMPANY_ID = 'cmo768eyx0001dbg6pld3obi3';

async function main() {
  console.log('Seeding master data for Alpha Corp...');

  // Seed Brands
  const brandNames = ['ACC Cement', 'Asian Paints', 'Pidilite', 'StonePlus', 'Laticrete'];
  for (const name of brandNames) {
    await prisma.brand.upsert({
      where: { name_companyId: { name, companyId: ALPHA_COMPANY_ID } },
      update: {},
      create: { name, active: true, companyId: ALPHA_COMPANY_ID }
    });
  }
  console.log('✅ Brands seeded');

  // Seed Units
  const unitNames = ['KG', 'Bag', 'Litre', 'Piece', 'Box', 'Bundle'];
  for (const name of unitNames) {
    await prisma.unit.upsert({
      where: { name_companyId: { name, companyId: ALPHA_COMPANY_ID } },
      update: {},
      create: { name, active: true, companyId: ALPHA_COMPANY_ID }
    });
  }
  console.log('✅ Units seeded');

  // Seed Categories (with subcategories)
  const parentCategories = [
    { name: 'Adhesives', children: ['Tile Adhesive', 'Wood Adhesive', 'Metal Adhesive'] },
    { name: 'Grouts', children: ['Cement Grout', 'Epoxy Grout'] },
    { name: 'Sealants', children: ['Silicon Sealant', 'Polyurethane Sealant'] },
    { name: 'Waterproofing', children: ['Liquid Membrane', 'Crystalline'] },
    { name: 'Accessories', children: ['Spacers', 'Trowels', 'Tools'] },
  ];

  for (const pc of parentCategories) {
    const parent = await prisma.category.upsert({
      where: { name_companyId: { name: pc.name, companyId: ALPHA_COMPANY_ID } },
      update: {},
      create: { name: pc.name, active: true, companyId: ALPHA_COMPANY_ID }
    });
    for (const childName of pc.children) {
      await prisma.category.upsert({
        where: { name_companyId: { name: childName, companyId: ALPHA_COMPANY_ID } },
        update: {},
        create: { name: childName, parentId: parent.id, active: true, companyId: ALPHA_COMPANY_ID }
      });
    }
  }
  console.log('✅ Categories & subcategories seeded');

  // Seed Distributors (Suppliers)
  const suppliers = [
    { distributorName: 'National Traders', city: 'Mumbai', contactPerson: 'Ramesh Gupta', phone: '9876543210', email: 'ramesh@national.com' },
    { distributorName: 'Star Chemicals', city: 'Delhi', contactPerson: 'Priya Shah', phone: '9876543211', email: 'priya@star.com' },
    { distributorName: 'Metro Distributors', city: 'Ahmedabad', contactPerson: 'Amit Patel', phone: '9876543212', email: 'amit@metro.com' },
  ];

  for (const s of suppliers) {
    const existing = await prisma.distributor.findFirst({
      where: { distributorName: s.distributorName, companyId: ALPHA_COMPANY_ID }
    });
    if (!existing) {
      await prisma.distributor.create({
        data: { ...s, active: true, companyId: ALPHA_COMPANY_ID }
      });
    }
  }
  console.log('✅ Suppliers (Distributors) seeded');

  // Seed Warehouses
  const warehouses = [
    { name: 'Main Warehouse', location: 'Mumbai', gstNumber: 'GST27AAAA1111B1Z5' },
    { name: 'Delhi Branch', location: 'New Delhi', gstNumber: 'GST07AAAA1111B1Z5' },
  ];

  for (const w of warehouses) {
    const existing = await prisma.warehouse.findFirst({
      where: { name: w.name, companyId: ALPHA_COMPANY_ID }
    });
    if (!existing) {
      await prisma.warehouse.create({
        data: { ...w, active: true, companyId: ALPHA_COMPANY_ID }
      });
    }
  }
  console.log('✅ Warehouses seeded');

  console.log('\n🎉 All master data seeded for Alpha Corp!');
}

main()
  .catch(e => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
