const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const user = await prisma.user.findUnique({ where: { email: 'kiran@kamla.com' } });
    if (!user) { console.log('No user'); return; }

    const warehouseAccess = await prisma.userWarehouseAccess.findMany({ where: { userId: user.id } });
    const warehouseIds = warehouseAccess.map(wa => wa.warehouseId);

    const productAccess = await prisma.userProductAccess.findMany({ where: { userId: user.id } });

    const brandIds = productAccess.map(pa => pa.brandId).filter(Boolean);
    const categoryIds = productAccess.map(pa => pa.categoryId).filter(Boolean);
    const productIds = productAccess.map(pa => pa.productId).filter(Boolean);

    const permissionConditions = [];
    if (brandIds.length && categoryIds.length) {
      permissionConditions.push({ AND: [ { brandId: { in: brandIds } }, { categoryId: { in: categoryIds } } ] });
    }
    if (brandIds.length && !categoryIds.length) {
      permissionConditions.push({ brandId: { in: brandIds } });
    }
    if (!brandIds.length && categoryIds.length) {
      permissionConditions.push({ categoryId: { in: categoryIds } });
    }
    if (productIds.length) {
      permissionConditions.push({ id: { in: productIds } });
    }

    const finalWhere = permissionConditions.length > 0 
      ? { AND: [{ companyId: user.companyId }, { OR: permissionConditions }] }
      : { companyId: user.companyId };

    const products = await prisma.product.findMany({
      where: finalWhere,
      orderBy: { updatedAt: 'desc' },
      include: { categoryRef: true, brand: true, unit: true }
    });

    console.log('Final Where:', JSON.stringify(finalWhere, null, 2));
    console.log('Products found:', products.length);
    if (products.length > 0) {
      console.log('Sample product:', products[0].name, 'Active:', products[0].active);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
