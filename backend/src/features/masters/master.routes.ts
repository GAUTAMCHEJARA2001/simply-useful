import { Router } from 'express';
import { sendSuccess } from '../../utils/response';
import { prisma } from '../../lib/prisma';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Masters
 *   description: Master Data Management
 */

// ==================== CATEGORIES ====================

router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    sendSuccess(res, categories, 'Categories fetched');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/categories', (req, res) => {
  sendSuccess(res, { id: Date.now(), ...req.body }, 'Category created');
});

router.put('/categories/:id', (req, res) => {
  sendSuccess(res, { id: req.params.id, ...req.body }, 'Category updated');
});

router.delete('/categories/:id', (req, res) => {
  sendSuccess(res, null, 'Category deleted');
});

// ==================== BRANDS ====================

router.get('/brands', async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    sendSuccess(res, brands, 'Brands fetched');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/brands', async (req, res) => {
  try {
    const brand = await prisma.brand.create({ data: { name: req.body.name } });
    sendSuccess(res, brand, 'Brand created');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/brands/:id', async (req, res) => {
  try {
    const brand = await prisma.brand.update({
      where: { id: Number(req.params.id) },
      data: { name: req.body.name, active: req.body.active }
    });
    sendSuccess(res, brand, 'Brand updated');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/brands/:id', async (req, res) => {
  try {
    await prisma.brand.update({ where: { id: Number(req.params.id) }, data: { active: false } });
    sendSuccess(res, null, 'Brand deleted');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==================== WAREHOUSES ====================

router.get('/warehouses', async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    sendSuccess(res, warehouses, 'Warehouses fetched');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==================== UNITS ====================

router.get('/units', async (req, res) => {
  try {
    const units = await prisma.unit.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    sendSuccess(res, units, 'Units fetched');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==================== PRODUCTS (via masters) ====================

router.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    });
    sendSuccess(res, products, 'Products fetched');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const data = req.body;
    const product = await prisma.product.create({
      data: {
        productCode: data.productCode || `P-${Date.now()}`,
        name: data.name,
        categoryId: Number(data.categoryId) || 1,
        bagSize: data.bagSize || '1',
        brandId: data.brandId ? Number(data.brandId) : undefined,
        unitId: data.unitId ? Number(data.unitId) : undefined,
        rate: Number(data.rate) || 0,
        gst: Number(data.gst) || 18,
      }
    });
    sendSuccess(res, product, 'Product created');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { category, stockQty, ...rest } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        categoryId: rest.categoryId ? Number(rest.categoryId) : undefined
      }
    });
    sendSuccess(res, product, 'Product updated');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
    sendSuccess(res, null, 'Product deleted');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==================== MARKETS & REGIONS ====================

router.get('/markets', async (req, res) => {
  try {
    const markets = await prisma.market.findMany({
      where: { active: true },
      include: { region: true },
      orderBy: { name: 'asc' }
    });
    sendSuccess(res, markets, 'Markets fetched');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/regions', async (req, res) => {
  try {
    const regions = await prisma.region.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    sendSuccess(res, regions, 'Regions fetched');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==================== USER ASSIGNMENTS ====================

router.get('/users/:id/assignments', (req, res) => {
  sendSuccess(res, { brands: [], categories: [], warehouses: [], products: [] }, 'Assignments fetched');
});

router.post('/users/:id/assignments', (req, res) => {
  sendSuccess(res, req.body, 'Assignments saved');
});

// ==================== SETTINGS (stub) ====================

router.get('/settings', (req, res) => {
  sendSuccess(res, { gstDefault: 18, currency: 'INR' }, 'Settings fetched');
});

router.put('/settings', (req, res) => {
  sendSuccess(res, req.body, 'Settings updated');
});

// ==================== SUPPLIERS (stub) ====================

router.get('/suppliers', (req, res) => {
  sendSuccess(res, [], 'Suppliers fetched');
});

// ==================== LABOURS (stub) ====================
router.get('/labours', (req, res) => {
  sendSuccess(res, [], 'Labours fetched');
});

// ==================== CUSTOMERS (stub) ====================
router.get('/customers', (req, res) => {
  sendSuccess(res, [], 'Customers fetched');
});

export default router;
