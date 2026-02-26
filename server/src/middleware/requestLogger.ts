/**
 * requestLogger.ts — HTTP request logging middleware
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    // Determine log level based on status code
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    logger.log(level, `${method} ${originalUrl} ${statusCode} - ${duration}ms - ${ip}`);
  });

  next();
}
