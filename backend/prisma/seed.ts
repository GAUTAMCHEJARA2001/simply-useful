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
  console.log('🌱 Starting Comprehensive System Seed...');

  // 1. Clean up volatile data (Orders only)
  console.log('🧹 Cleaning up orders/items...');
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});

  // 2. Idempotent User Seed
  console.log('👥 Seeding users (ADMIN, SALES, HR, INVENTORY)...');
  const password = await bcryptjs.hash('admin123', 10);
  
  const users = [
    { email: 'admin@tileco.com', name: 'Priya Sharma (Admin)', role: UserRole.ADMIN },
    { email: 'sales@tileco.com', name: 'Rajesh Kumar (Sales)', role: UserRole.SALES },
    { email: 'hr@tileco.com', name: 'Anjali Singh (HR)', role: UserRole.HR },
    { email: 'inventory@tileco.com', name: 'Vikram Mehta (Inventory)', role: UserRole.INVENTORY },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name },
      create: { ...u, hashedPassword: password },
    });
  }

  // 3. Diversified Product Seed
  console.log('📦 Seeding diversified product catalog...');
  const productData = [
    // High Stock
    { productCode: 'AD-001', name: 'TileFix Standard Gray', category: 'Adhesive', bagSize: '20 KG', rate: 350, gst: 18, stockQty: 850 },
    { productCode: 'AD-002', name: 'TileFix Premium White', category: 'Adhesive', bagSize: '20 KG', rate: 520, gst: 18, stockQty: 620 },
    // Medium Stock
    { productCode: 'GR-001', name: 'GroutMaster Bone Ivory', category: 'Grout', bagSize: '5 KG', rate: 310, gst: 18, stockQty: 85 },
    { productCode: 'GR-002', name: 'GroutMaster Charcoal', category: 'Grout', bagSize: '5 KG', rate: 310, gst: 18, stockQty: 42 },
    // Low Stock (Testing Alerts)
    { productCode: 'AD-003', name: 'Rapid Set Adhesive', category: 'Adhesive', bagSize: '25 KG', rate: 750, gst: 18, stockQty: 8 },
    { productCode: 'SL-001', name: 'Industrial Epoxy Sealant', category: 'Sealant', bagSize: '1 KG', rate: 1250, gst: 18, stockQty: 4 },
    // Out of Stock (Edge Case)
    { productCode: 'SL-002', name: 'Nano Leak Plugger', category: 'Sealant', bagSize: '500 ML', rate: 4500, gst: 18, stockQty: 0 },
  ];

  const dbProducts = [];
  for (const p of productData) {
    const product = await prisma.product.upsert({
      where: { productCode: p.productCode },
      update: { ...p },
      create: { ...p },
    });
    dbProducts.push(product);
  }

  // 4. Historical Sales Simulation (Last 30 Days)
  console.log('📈 Simulating 30 days of historical sales...');
  const statuses = [OrderStatus.Completed, OrderStatus.Approved, OrderStatus.Pending];
  const parties = ['Galaxy Ceramics', 'Metro Tiles Distr', 'Home Decor Hub', 'BuildNext Supply'];

  for (let i = 0; i < 30; i++) {
    const orderDate = subDays(new Date(), Math.floor(Math.random() * 30));
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const randomParty = parties[Math.floor(Math.random() * parties.length)];
    const orderId = `ORD-${1000 + i}`;

    const orderProducts = dbProducts.slice(0, 2); // Just use first few for simplicity
    
    await prisma.order.create({
      data: {
        orderId,
        date: orderDate,
        soEmail: 'sales@tileco.com',
        partyType: i % 2 === 0 ? 'Dealer' : 'Distributor',
        partyName: randomParty,
        distributor: 'Universal Distributors',
        status: randomStatus,
        grandTotal: 0, // Calculated below
        items: {
          create: orderProducts.map(p => ({
            productId: p.id,
            qty: Math.floor(Math.random() * 10) + 1,
            price: p.rate,
            total: p.rate * (Math.floor(Math.random() * 10) + 1),
          }))
        }
      }
    });

    // Update grand total (simplified for seed)
    const createdOrder = await prisma.order.findUnique({ where: { orderId }, include: { items: true } });
    if (createdOrder) {
      const total = createdOrder.items.reduce((acc, item) => acc + item.total, 0);
      await prisma.order.update({
        where: { id: createdOrder.id },
        data: { grandTotal: total }
      });
    }
  }

  console.log('✅ System Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
