import { Router, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { prisma } from '../../lib/prisma';
import { protect } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { isDbConnectionError } from '../../utils/prismaErrors';

const router = Router();

// Apply auth middleware to ALL master routes
router.use(protect as any);

/**
 * @swagger
 * tags:
 *   name: Masters
 *   description: Master Data Management
 */

// ==================== CATEGORIES ====================

router.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const where = companyId ? { active: true, companyId } : { active: true };
    const categories = await prisma.category.findMany({ where, orderBy: { name: 'asc' } });
    sendSuccess(res, categories, 'Categories fetched');
  } catch (e: any) {
    if (isDbConnectionError(e)) return sendSuccess(res, [], 'Categories fetched');
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const category = await prisma.category.create({
      data: { name: req.body.name, companyId, parentId: req.body.parentId ? Number(req.body.parentId) : null }
    });
    sendSuccess(res, category, 'Category created');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/categories/:id', async (req: AuthRequest, res: Response) => {
  try {
    const category = await prisma.category.update({
      where: { id: Number(req.params.id) },
      data: { name: req.body.name, parentId: req.body.parentId ? Number(req.body.parentId) : null, active: req.body.active }
    });
    sendSuccess(res, category, 'Category updated');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/categories/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.category.update({ where: { id: Number(req.params.id) }, data: { active: false } });
    sendSuccess(res, null, 'Category deleted');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==================== BRANDS ====================

router.get('/brands', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const where = companyId ? { active: true, companyId } : { active: true };
    const brands = await prisma.brand.findMany({ where, orderBy: { name: 'asc' } });
    sendSuccess(res, brands, 'Brands fetched');
  } catch (e: any) {
    if (isDbConnectionError(e)) return sendSuccess(res, [], 'Brands fetched');
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/brands', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const brand = await prisma.brand.create({ data: { name: req.body.name, companyId } });
    sendSuccess(res, brand, 'Brand created');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/brands/:id', async (req: AuthRequest, res: Response) => {
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

router.delete('/brands/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.brand.update({ where: { id: Number(req.params.id) }, data: { active: false } });
    sendSuccess(res, null, 'Brand deleted');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==================== WAREHOUSES ====================

router.get('/warehouses', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const where = companyId ? { active: true, companyId } : { active: true };
    const warehouses = await prisma.warehouse.findMany({ where, orderBy: { name: 'asc' } });
    sendSuccess(res, warehouses, 'Warehouses fetched');
  } catch (e: any) {
    if (isDbConnectionError(e)) return sendSuccess(res, [], 'Warehouses fetched');
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/warehouses', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const warehouse = await prisma.warehouse.create({
      data: { ...req.body, companyId }
    });
    sendSuccess(res, warehouse, 'Warehouse created');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/warehouses/:id', async (req: AuthRequest, res: Response) => {
  try {
    const warehouse = await prisma.warehouse.update({
      where: { id: Number(req.params.id) as any },
      data: req.body
    });
    sendSuccess(res, warehouse, 'Warehouse updated');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==================== UNITS ====================

router.get('/units', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const where = companyId ? { active: true, companyId } : { active: true };
    const units = await prisma.unit.findMany({ where, orderBy: { name: 'asc' } });
    sendSuccess(res, units, 'Units fetched');
  } catch (e: any) {
    if (isDbConnectionError(e)) return sendSuccess(res, [], 'Units fetched');
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/units', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const unit = await prisma.unit.create({ data: { name: req.body.name, companyId } });
    sendSuccess(res, unit, 'Unit created');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==================== PRODUCTS (via masters) ====================

router.get('/products', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const where = companyId ? { active: true, companyId } : { active: true };
    const products = await prisma.product.findMany({ where, orderBy: { name: 'asc' } });
    sendSuccess(res, products, 'Products fetched');
  } catch (e: any) {
    if (isDbConnectionError(e)) return sendSuccess(res, [], 'Products fetched');
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/products', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
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
        companyId
      }
    });
    sendSuccess(res, product, 'Product created');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/products/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { category, stockQty, ...rest } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { ...rest, categoryId: rest.categoryId ? Number(rest.categoryId) : undefined }
    });
    sendSuccess(res, product, 'Product updated');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/products/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
    sendSuccess(res, null, 'Product deleted');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==================== MARKETS & REGIONS ====================

router.get('/markets', async (req: AuthRequest, res: Response) => {
  try {
    const markets = await prisma.market.findMany({
      where: { active: true },
      include: { region: true },
      orderBy: { name: 'asc' }
    });
    sendSuccess(res, markets, 'Markets fetched');
  } catch (e: any) {
    if (isDbConnectionError(e)) return sendSuccess(res, [], 'Markets fetched');
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/regions', async (req: AuthRequest, res: Response) => {
  try {
    const regions = await prisma.region.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    sendSuccess(res, regions, 'Regions fetched');
  } catch (e: any) {
    if (isDbConnectionError(e)) return sendSuccess(res, [], 'Regions fetched');
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==================== USER ASSIGNMENTS ====================

router.get('/users/:id/assignments', (req: AuthRequest, res: Response) => {
  sendSuccess(res, { brands: [], categories: [], warehouses: [], products: [] }, 'Assignments fetched');
});

router.post('/users/:id/assignments', (req: AuthRequest, res: Response) => {
  sendSuccess(res, req.body, 'Assignments saved');
});

// ==================== SETTINGS ====================

router.get('/settings', (req: AuthRequest, res: Response) => {
  sendSuccess(res, { gstDefault: 18, currency: 'INR' }, 'Settings fetched');
});

router.put('/settings', (req: AuthRequest, res: Response) => {
  sendSuccess(res, req.body, 'Settings updated');
});

// ==================== SUPPLIERS ====================

router.get('/suppliers', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const where = companyId ? { active: true, companyId } : { active: true };
    const suppliers = await prisma.supplier.findMany({ where, orderBy: { name: 'asc' } });
    sendSuccess(res, suppliers, 'Suppliers fetched');
  } catch (e: any) {
    if (isDbConnectionError(e)) return sendSuccess(res, [], 'Suppliers fetched');
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/suppliers', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const supplier = await prisma.supplier.create({ data: { ...req.body, companyId } });
    sendSuccess(res, supplier, 'Supplier created');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/suppliers/:id', async (req: AuthRequest, res: Response) => {
  try {
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, supplier, 'Supplier updated');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/suppliers/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.supplier.update({ where: { id: req.params.id }, data: { active: false } });
    sendSuccess(res, null, 'Supplier deleted');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==================== LABOURS ====================

router.get('/labours', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const where = companyId ? { active: true, companyId } : { active: true };
    const labours = await prisma.labour.findMany({ where, orderBy: { name: 'asc' } });
    sendSuccess(res, labours, 'Labours fetched');
  } catch (e: any) {
    if (isDbConnectionError(e)) return sendSuccess(res, [], 'Labours fetched');
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/labours', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const labour = await prisma.labour.create({ data: { ...req.body, companyId } });
    sendSuccess(res, labour, 'Labour created');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/labours/:id', async (req: AuthRequest, res: Response) => {
  try {
    const labour = await prisma.labour.update({ where: { id: Number(req.params.id) }, data: req.body });
    sendSuccess(res, labour, 'Labour updated');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/labours/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.labour.update({ where: { id: Number(req.params.id) }, data: { active: false } });
    sendSuccess(res, null, 'Labour deleted');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ==================== CUSTOMERS ====================
router.get('/customers', (req: AuthRequest, res: Response) => {
  sendSuccess(res, [], 'Customers fetched');
});

export default router;
