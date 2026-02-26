/**
 * authRoutes.ts — Register & Login endpoints.
 * Mounted at /api/auth in app.ts
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import { signToken } from '../middleware/auth';

const router = Router();

// ── POST /api/auth/register ──────────────────────────────────────────────
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('name').notEmpty().withMessage('Name required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, name } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const user = await User.create({ email, password, name });
    const token = signToken({ userId: user.id, email: user.email });

    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  },
);

// ── POST /api/auth/login ─────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  },
);

export default router;