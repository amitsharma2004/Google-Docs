/**
 * authController.ts — Authentication controller
 * Handles user registration and login logic
 */

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    const { email, password, name } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const user = await User.create({ email, password, name });
    
    // Generate tokens using model method
    const { accessToken, refreshToken } = user.generateTokens();
    
    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

    // Set HTTP-only cookies (more secure than localStorage)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({ 
      token: accessToken,  // Also send in response for localStorage fallback
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
};

/**
 * Login existing user
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate tokens using model method
    const { accessToken, refreshToken } = user.generateTokens();
    
    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

    // Set HTTP-only cookies (more secure than localStorage)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ 
      token: accessToken,  // Also send in response for localStorage fallback
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed' });
  }
};

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    // Find user with this refresh token
    const user = await User.findOne({ refreshToken });
    if (!user) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    // Generate new tokens
    const tokens = user.generateTokens();
    
    // Update refresh token in database
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({ 
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Token refresh failed' });
  }
};

/**
 * Logout user (invalidate refresh token)
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (userId) {
      // Remove refresh token from database
      await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Logout failed' });
  }
};