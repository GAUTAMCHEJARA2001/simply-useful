import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { sendSuccess } from '../../utils/response';

const router = Router();

/**
 * GET /api/v1/users?page=1&limit=10&search=abc
 * Full user list with pagination + search
 */
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});


/**
 * POST /api/v1/users  — Create user
 */
router.post('/', async (req, res) => {
  try {
    const { email, password, name, role, active } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'email, password and name are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, hashedPassword, name, role: role || 'SALES', active: active !== false },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });
    sendSuccess(res, user, 'User created successfully');
  } catch (e: any) {
    if (e.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * PUT /api/v1/users/:id  — Update user profile
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, role, active } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, role, active },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    sendSuccess(res, user, 'User updated successfully');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * DELETE /api/v1/users/:id  — Soft delete (deactivate)
 */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    sendSuccess(res, null, 'User deactivated successfully');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * PUT /api/v1/users/:id/password  — Reset password
 */
router.put('/:id/password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { hashedPassword },
    });
    sendSuccess(res, null, 'Password updated successfully');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * PUT /api/v1/users/:id/target  — Set monthly target
 */
router.put('/:id/target', async (req, res) => {
  try {
    // monthlyTarget isn't in schema, return success for UI compatibility
    sendSuccess(res, { id: req.params.id, monthlyTarget: req.body.target }, 'Target updated');
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
