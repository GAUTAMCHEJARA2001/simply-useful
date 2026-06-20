/// <reference types="node" />
import { PrismaClient, UserRole, OrderStatus } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to substract days from a date
const subDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

async function main() {
  console.log('🌱 Starting Comprehensive system-wide Mock Data Seed...');

  // 1. CLEAN UP VOLATILE DATA
  console.log('🧹 Cleaning up records for fresh start...');
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.visit.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.purchaseItem.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.bOMItem.deleteMany({});
  await prisma.bOM.deleteMany({});
  await prisma.market.deleteMany({});
  await prisma.product.deleteMany({}); // Delete products first due to relations
  await prisma.dealer.deleteMany({});
  await prisma.distributor.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.region.deleteMany({});

  const password = await bcryptjs.hash('admin123', 10);

  // 2. SEED USERS (5 ROLES)
  console.log('👥 Seeding 5 users (one for each role)...');
  const userData = [
    { email: 'admin@simplyuseful.com', name: 'System Admin', role: UserRole.ADMIN },
    { email: 'superadmin@simplyuseful.com', name: 'Chief Executive', role: UserRole.SUPERADMIN },
    { email: 'sales@simplyuseful.com', name: 'Raj Kumar', role: UserRole.SALES },
    { email: 'hr@simplyuseful.com', name: 'Sneha Rao', role: UserRole.HR },
    { email: 'inventory@simplyuseful.com', name: 'Manish Gupta', role: UserRole.INVENTORY },
  ];

  for (const u of userData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name, active: true },
      create: { ...u, hashedPassword: password, active: true },
    });
  }

  // 3. SEED MASTER DATA (5 EACH)
  console.log('🏗️ Seeding primary masters...');
  const units = ['KG', 'BAG', 'LTR', 'MTR', 'PCS'];
  const seededUnits = [];
  for (const name of units) {
    const u = await prisma.unit.create({ data: { name, active: true } });
    seededUnits.push(u);
  }

  const brands = ['Premium Bond', 'Ultra Tiles', 'Eco Fix', 'Grout Expert', 'Seal Guard'];
  const seededBrands = [];
  for (const name of brands) {
    const b = await prisma.brand.create({ data: { name, active: true } });
    seededBrands.push(b);
  }

  const regions = ['North Range', 'South Hub', 'East Sector', 'West Zone', 'Central Block'];
  const seededRegions = [];
  for (const name of regions) {
    const r = await prisma.region.create({ data: { name, active: true } });
    seededRegions.push(r);
  }

  const warehouses = ['Main Warehouse', 'North Depot', 'South Terminal', 'East Gateway', 'West Yard'];
  for (const name of warehouses) {
    await prisma.warehouse.create({ data: { name, active: true } });
  }

  // 4. SEED MARKETS (5)
  console.log('🏪 Seeding markets...');
  for (let i = 0; i < 5; i++) {
    await prisma.market.create({
      data: {
        name: `Market ${seededRegions[i].name}`,
        regionId: seededRegions[i].id,
        active: true
      }
    });
  }

  // 5. SEED PRODUCTS (5)
  console.log('📦 Seeding products...');
  const productData = [
    { productCode: 'P-001', name: 'Floor Adhesive Silver', category: 'Adhesive', bagSize: '20 KG', rate: 450, gst: 18, stockQty: 500, brandId: seededBrands[0].id, unitId: seededUnits[1].id },
    { productCode: 'P-002', name: 'Wall Grout Gold', category: 'Grout', bagSize: '5 KG', rate: 280, gst: 18, stockQty: 250, brandId: seededBrands[3].id, unitId: seededUnits[4].id },
    { productCode: 'P-003', name: 'Industrial Sealant X', category: 'Sealant', bagSize: '1 LTR', rate: 1200, gst: 18, stockQty: 100, brandId: seededBrands[4].id, unitId: seededUnits[2].id },
    { productCode: 'P-004', name: 'Tile Spacer 2mm', category: 'Accessory', bagSize: '100 PCS', rate: 45, gst: 12, stockQty: 1000, brandId: seededBrands[2].id, unitId: seededUnits[4].id },
    { productCode: 'P-005', name: 'Epoxy Hardener', category: 'Chemical', bagSize: '2 KG', rate: 850, gst: 18, stockQty: 0, brandId: seededBrands[1].id, unitId: seededUnits[0].id },
  ];

  const dbProducts = [];
  for (const p of productData) {
    const product = await prisma.product.create({ data: { ...p, active: true } });
    dbProducts.push(product);
  }

  // 6. SEED DISTRIBUTORS & DEALERS (5 EACH)
  console.log('🤝 Seeding partners...');
  const seededDistributors = [];
  for (let i = 1; i <= 5; i++) {
    const d = await prisma.distributor.create({
      data: {
        distributorName: `Distributor ${i}`,
        area: `Zone ${i}`,
        assignedSoEmail: 'sales@simplyuseful.com',
        creditLimit: 500000,
        outstanding: 150000 * i,
        active: true
      }
    });
    seededDistributors.push(d);
  }

  const seededDealers = [];
  for (let i = 1; i <= 5; i++) {
    const d = await prisma.dealer.create({
      data: {
        dealerCode: `DLR-00${i}`,
        dealerName: `Dealer Shop ${i}`,
        city: `City ${i}`,
        assignedSoEmail: 'sales@simplyuseful.com',
        distributorName: i > 3 ? null : seededDistributors[i-1].distributorName,
        creditLimit: 200000,
        outstanding: 25000 * i,
        active: true
      }
    });
    seededDealers.push(d);
  }

  // 7. SEED ORDERS (5)
  console.log('🛒 Seeding orders...');
  const orderStatuses = [OrderStatus.Pending, OrderStatus.Approved, OrderStatus.Dispatched, OrderStatus.Completed, OrderStatus.Cancelled];
  for (let i = 0; i < 5; i++) {
    const orderId = `ORD-2024-${1000 + i}`;
    await prisma.order.create({
      data: {
        orderId,
        date: subDays(new Date(), i * 2),
        soEmail: 'sales@simplyuseful.com',
        partyType: i % 2 === 0 ? 'Dealer' : 'Distributor',
        partyName: i % 2 === 0 ? seededDealers[i].dealerName : seededDistributors[i].distributorName,
        distributor: seededDistributors[i].distributorName,
        narration: `Bulk order for project ${i + 1}. Urgent dispatch requested.`,
        status: orderStatuses[i],
        grandTotal: 1500 * (i + 1), // Simplified
        items: {
          create: [
            {
              productId: dbProducts[i % 5].id,
              qty: 10 + i,
              price: dbProducts[i % 5].rate,
              total: dbProducts[i % 5].rate * (10 + i),
              itemRemark: `Check batch ${i}`
            }
          ]
        }
      }
    });
  }

  // 8. SEED VISITS & EXPENSES (5 EACH)
  console.log('📍 Seeding field activities...');
  const photoSample = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  for (let i = 0; i < 5; i++) {
    await prisma.visit.create({
      data: {
        date: subDays(new Date(), i),
        soEmail: 'sales@simplyuseful.com',
        dealerName: seededDealers[i].dealerName,
        remarks: `Visited to discuss monthly targets. Dealer requested 5% discount on ${dbProducts[i].name}.`,
        nextFollowup: subDays(new Date(), -7),
        nextVisitTime: subDays(new Date(), -7),
        gpsLocation: `28.6139, 77.2090`, // Delhi coordinates
        photo: photoSample
      }
    });

    await prisma.expense.create({
      data: {
        date: subDays(new Date(), i),
        soEmail: 'sales@simplyuseful.com',
        category: i % 2 === 0 ? 'Travel' : 'Food',
        amount: 500 + (i * 150),
        remarks: `Sales visit to ${seededDealers[i].city}`,
        status: i === 4 ? 'Rejected' : i === 3 ? 'Approved' : 'Pending',
        photo: photoSample,
        rejectReason: i === 4 ? 'Missing bill receipt' : null,
        declaration: 'I hereby declare that this expense was incurred for business purposes.'
      }
    });
  }

  // 9. SEED BOMS & PURCHASES (5 EACH)
  console.log('🏭 Seeding inventory & production data...');
  for (let i = 0; i < 5; i++) {
    const bomProduct = dbProducts[i];
    await prisma.bOM.create({
      data: {
        productCode: `BOM-${bomProduct.productCode}`,
        name: `BOM for ${bomProduct.name}`,
        items: {
          create: [
            { materialName: 'Raw Resin', qty: 10.5, unit: 'KG' },
            { materialName: 'Pigment White', qty: 2.0, unit: 'KG' }
          ]
        }
      }
    });

    await prisma.purchase.create({
      data: {
        purchaseId: `PUR-${5000 + i}`,
        date: subDays(new Date(), i * 3),
        vendorName: `Industrial Supply Corp ${i + 1}`,
        grandTotal: 15000 * (i + 1),
        status: i % 2 === 0 ? 'Received' : 'Pending',
        items: {
          create: [
            { productName: 'Quality Quartz', qty: 100, rate: 120, total: 12000 },
            { productName: 'Binding Agent', qty: 50, rate: 60, total: 3000 }
          ]
        }
      }
    });
  }

  console.log('🚀 SEEDING COMPLETE: 5 Records generated for each and every feature!');
}

main()
  .catch((e) => {
    console.error('❌ Comprehensive Seed Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
