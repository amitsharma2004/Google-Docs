import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// Register new user
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide name, email, and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          subscription: user.subscription,
          usage: user.usage,
          planLimits: user.planLimits
        },
        token
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
};

// Login user
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password'
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    logger.info(`User logged in: ${email}`);

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          subscription: user.subscription,
          usage: user.usage,
          planLimits: user.planLimits
        },
        token
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          subscription: user.subscription,
          usage: user.usage,
          planLimits: user.planLimits,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    next(error);
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { name, avatar } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    logger.info(`User profile updated: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          subscription: user.subscription
        }
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    next(error);
  }
};

// Change password
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide current password and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    next(error);
  }
};

// Delete user account
export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide your password to confirm deletion'
      });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Password is incorrect'
      });
    }

    await User.findByIdAndDelete(userId);

    logger.info(`User account deleted: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('Delete account error:', error);
    next(error);
  }
};

// Check usage limits
export const checkLimits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const limits = {
      documents: {
        used: user.usage.documentsCreated,
        limit: user.planLimits.maxDocuments,
        exceeded: user.hasExceededLimit('documents'),
        percentage: user.planLimits.maxDocuments === -1 
          ? 0 
          : (user.usage.documentsCreated / user.planLimits.maxDocuments) * 100
      },
      storage: {
        used: user.usage.storageUsed,
        limit: user.planLimits.maxStorage,
        exceeded: user.hasExceededLimit('storage'),
        percentage: user.planLimits.maxStorage === -1 
          ? 0 
          : (user.usage.storageUsed / user.planLimits.maxStorage) * 100
      },
      collaborators: {
        used: user.usage.collaboratorsAdded,
        limit: user.planLimits.maxCollaborators,
        exceeded: user.hasExceededLimit('collaborators'),
        percentage: user.planLimits.maxCollaborators === -1 
          ? 0 
          : (user.usage.collaboratorsAdded / user.planLimits.maxCollaborators) * 100
      }
    };

    res.status(200).json({
      status: 'success',
      data: {
        plan: user.subscription.plan,
        limits
      }
    });
  } catch (error) {
    logger.error('Check limits error:', error);
    next(error);
  }
};