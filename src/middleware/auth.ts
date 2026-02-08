import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../utils/logger.js';

interface JwtPayload {
  id: string;
  email: string;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided. Please login to access this resource'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload;

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User no longer exists'
      });
    }

    // Check if subscription is active
    if (user.subscription.status !== 'active') {
      logger.warn(`Inactive subscription access attempt: ${user.email}`);
    }

    // Attach user to request
    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      subscription: user.subscription
    };

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token. Please login again'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired. Please login again'
      });
    }

    logger.error('Authentication error:', error);
    next(error);
  }
};

// Middleware to check if user has required subscription plan
export const requirePlan = (...plans: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPlan = req.user?.subscription?.plan;

    if (!plans.includes(userPlan)) {
      return res.status(403).json({
        status: 'error',
        message: `This feature requires ${plans.join(' or ')} plan. Please upgrade your subscription`,
        requiredPlans: plans,
        currentPlan: userPlan
      });
    }

    next();
  };
};

// Middleware to check if user has exceeded limits
export const checkLimit = (limitType: 'documents' | 'storage' | 'collaborators') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      if (user.hasExceededLimit(limitType)) {
        const limitKey = limitType === 'documents' ? 'maxDocuments' 
          : limitType === 'storage' ? 'maxStorage' 
          : 'maxCollaborators';
        
        return res.status(403).json({
          status: 'error',
          message: `You have exceeded your ${limitType} limit. Please upgrade your plan`,
          limit: user.planLimits[limitKey],
          currentPlan: user.subscription.plan
        });
      }

      next();
    } catch (error) {
      logger.error('Check limit error:', error);
      next(error);
    }
  };
};