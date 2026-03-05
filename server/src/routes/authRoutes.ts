/**
 * authRoutes.ts — Register & Login endpoints.
 * Mounted at /api/auth in app.ts
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { sendOTP, register, login, refreshToken, logout } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// ── POST /api/auth/send-otp ──────────────────────────────────────────────
router.post(
  '/send-otp',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('purpose').isIn(['registration', 'login']).withMessage('Purpose must be registration or login'),
  ],
  sendOTP
);

// ── POST /api/auth/register ──────────────────────────────────────────────
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('name').notEmpty().withMessage('Name required'),
    body('username').optional(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit OTP required'),
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