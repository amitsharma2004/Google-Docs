import express from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  checkLimits
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (require authentication)
router.use(authenticate);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.post('/change-password', changePassword);
router.delete('/account', deleteAccount);
router.get('/limits', checkLimits);

export default router;