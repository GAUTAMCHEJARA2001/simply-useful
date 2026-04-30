import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthRequest } from '../../types';
import asyncHandler from '../../utils/asyncHandler';

const router = Router();

// ✅ Dashboard KPIs
router.get('/dashboard-kpis', asyncHandler(async (req: AuthRequest, res: Response) => {
  const companyId = req.user!.companyId;
  const condition = companyId ? { companyId } : {};

  const totalProducts = await prisma.product.count({ where: condition });
  const totalDealers = await prisma.dealer.count({ where: condition });
  const totalOrders = await prisma.order.count({ where: condition });
  const revenueResult = await prisma.order.aggregate({
    _sum: { grandTotal: true },
    where: { ...condition, status: 'Completed' }
  });

  const totalStockValue = await prisma.inventory.aggregate({
    _sum: { quantity: true },
    where: { product: condition }
  });

  res.json({
    success: true,
    data: {
      products: totalProducts,
      dealers: totalDealers,
      revenue: Math.round(revenueResult._sum.grandTotal || 0),
      orders: totalOrders,
      totalStockValue: totalStockValue._sum.quantity || 0,
    }
  });
}));

// ✅ Sales Summary (Trends for Charts)
router.get('/sales-summary', asyncHandler(async (req: AuthRequest, res: Response) => {
  const companyId = req.user!.companyId;
  const condition = companyId ? { companyId } : {};

  const sales = await prisma.order.findMany({
    where: { ...condition, status: 'Completed' },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true, grandTotal: true }
  });

  // Group by date for chart
  const trends = sales.reduce((acc: any, sale) => {
    const date = sale.createdAt.toISOString().split('T')[0];
    if (!acc[date]) acc[date] = 0;
    acc[date] += sale.grandTotal;
    return acc;
  }, {});

  const chartData = Object.entries(trends).map(([name, total]) => ({ name, total }));

  res.json({
    success: true,
    data: chartData
  });
}));

// ✅ Low Stock
router.get('/low-stock', asyncHandler(async (req: AuthRequest, res: Response) => {
  const companyId = req.user!.companyId;
  const condition = companyId ? { companyId } : {};

  const stockAggregation = await prisma.inventory.groupBy({
    by: ['productId'],
    where: { product: condition },
    _sum: { quantity: true },
    having: {
      quantity: {
        _sum: { lt: 50 }
      }
    }
  });

  const products = await prisma.product.findMany({
    where: { id: { in: stockAggregation.map(s => s.productId) }, ...condition },
    include: { categoryRef: true, unit: true }
  });

  const data = products.map(p => {
    const stock = stockAggregation.find(s => s.productId === p.id);
    return {
      id: p.id,
      productName: p.name,
      sku: p.productCode,
      categoryName: p.categoryRef?.name,
      unit: p.unit?.name || '—',
      currentStock: stock?._sum?.quantity || 0,
      availableStock: stock?._sum?.quantity || 0,
      minimumStock: 50
    };
  });

  res.json({ success: true, data });
}));

// ✅ Daily Report
router.get('/daily', asyncHandler(async (req: AuthRequest, res: Response) => {
  const companyId = req.user!.companyId;
  const condition = companyId ? { companyId } : {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [sales, purchases, pending] = await Promise.all([
    prisma.order.findMany({ where: { ...condition, createdAt: { gte: today } } }),
    prisma.purchase.findMany({ where: { ...condition, createdAt: { gte: today } } }),
    prisma.order.count({ where: { ...condition, status: 'Pending' } })
  ]);

  res.json({
    success: true,
    data: {
      date: today,
      sales: { count: sales.length, list: sales },
      purchases: { count: purchases.length, list: purchases },
      pendingCount: pending
    }
  });
}));

// ✅ Current Stock (Per Product Detail)
router.get('/current-stock', asyncHandler(async (req: AuthRequest, res: Response) => {
  const companyId = req.user!.companyId;
  const condition = companyId ? { companyId } : {};

  const products = await prisma.product.findMany({
    where: condition,
    include: {
      unit: true,
      brand: true,
      categoryRef: true,
      inventory: {
        include: { warehouse: true }
      }
    }
  });

  const stockRaw: any[] = [];
  products.forEach(p => {
    p.inventory.forEach(inv => {
      stockRaw.push({
        productId: p.id,
        productName: p.name,
        sku: p.productCode,
        categoryName: p.categoryRef?.name,
        unit: p.unit?.name || '—',
        currentStock: inv.quantity,
        availableStock: inv.quantity,
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse?.name || 'Unknown'
      });
    });
  });

  res.json({ success: true, data: stockRaw });
}));

// ✅ Aggregate Stock (Consolidated)
router.get('/aggregate-stock', asyncHandler(async (req: AuthRequest, res: Response) => {
  const companyId = req.user!.companyId;
  const condition = companyId ? { companyId } : {};

  const products = await prisma.product.findMany({
    where: condition,
    include: { inventory: true, categoryRef: true, unit: true }
  });

  const aggregate = products.map(p => ({
    productId: p.id,
    productName: p.name,
    sku: p.productCode,
    categoryName: p.categoryRef?.name,
    totalStock: p.inventory.reduce((sum, inv) => sum + inv.quantity, 0),
    availableStock: p.inventory.reduce((sum, inv) => sum + inv.quantity, 0),
    unit: p.unit?.name || 'Units'
  }));

  res.json({ success: true, data: aggregate });
}));

// ✅ Global Inventory (SuperAdmin only)
router.get('/global-inventory', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'SUPERADMIN') {
    return res.status(403).json({ success: false, message: 'Forbidden: SuperAdmin access only' });
  }

  const inventoryRaw = await prisma.inventory.findMany({
    include: {
      product: {
        include: { 
          company: true,
          unit: true,
          categoryRef: true
        }
      },
      warehouse: true
    }
  });

  const data = inventoryRaw.map(inv => ({
    id: inv.id,
    companyName: inv.product.company.name,
    productName: inv.product.name,
    sku: inv.product.productCode,
    categoryName: inv.product.categoryRef?.name || 'Uncategorized',
    quantity: inv.quantity,
    unit: inv.product.unit?.name || 'Units',
    warehouseName: inv.warehouse?.name || 'External',
    updatedAt: inv.updatedAt
  }));

  res.json({ success: true, data });
}));

export default router;
