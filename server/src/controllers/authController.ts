/**
 * authController.ts — Authentication controller with OTP verification
 */

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import OTP from '../models/OTP';
import EmailService from '../services/EmailService';
import crypto from 'crypto';

/**
 * Generate 6-digit OTP
 */
function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Send OTP for registration
 * POST /api/auth/send-otp
 */
export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    const { email, purpose } = req.body;

    // Check if user already exists for registration
    if (purpose === 'registration') {
      const existing = await User.findOne({ email });
      if (existing) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }
    }

    // Check if user exists for login
    if (purpose === 'login') {
      const user = await User.findOne({ email });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTPs for this email and purpose
    await OTP.deleteMany({ email, purpose });

    // Save new OTP
    await OTP.create({ email, otp, purpose, expiresAt });

    // Send OTP email
    const emailSent = await EmailService.sendOTP(email, otp, purpose);

    if (!emailSent) {
      res.status(500).json({ error: 'Failed to send OTP email' });
      return;
    }

    res.json({ 
      message: 'OTP sent successfully',
      email,
      otp,
      expiresIn: 600 // seconds
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to send OTP' });
  }
};

/**
 * Register a new user with OTP verification
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    const { email, password, name, username, otp } = req.body;

    // Verify OTP
    const otpRecord = await OTP.findOne({
      email,
      otp,
      purpose: 'registration',
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Create user
    const user = await User.create({ 
      email, 
      password, 
      name, 
      username: username || name,
      emailVerified: true 
    });
    
    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Generate tokens
    const { accessToken, refreshToken } = user.generateTokens();
    
    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Send welcome email (don't wait for it)
    EmailService.sendWelcomeEmail(email, username || name).catch(err => 
      console.error('Failed to send welcome email:', err)
    );

    // Set cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({ 
      token: accessToken,
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, username: user.username } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
};

/**
 * Login without OTP verification
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

    // Find user
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate tokens
    const { accessToken, refreshToken } = user.generateTokens();
    
    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Set cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ 
      token: accessToken,
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, username: user.username } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed' });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const user = await User.findOne({ refreshToken });
    if (!user) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const tokens = user.generateTokens();
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
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (userId) {
      await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Logout failed' });
  }
};
