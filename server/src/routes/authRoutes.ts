/**
 * authRoutes.ts — Register & Login endpoints.
 * Mounted at /api/auth in app.ts
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, refreshToken, logout } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// ── POST /api/auth/register ──────────────────────────────────────────────
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('name').notEmpty().withMessage('Name required'),
  ],
  register
);

// ── POST /api/auth/login ─────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
  ],
  login
);

// ── POST /api/auth/refresh ───────────────────────────────────────────────
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token required')],
  refreshToken
);

// ── POST /api/auth/logout ────────────────────────────────────────────────
router.post('/logout', authenticate, logout);

export default router;