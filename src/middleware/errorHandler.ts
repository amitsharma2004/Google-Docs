import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

interface CustomError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

const handleCastErrorDB = (err: any): CustomError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  const error = new Error(message) as CustomError;
  error.statusCode = 400;
  error.isOperational = true;
  return error;
};

const handleDuplicateFieldsDB = (err: any): CustomError => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  const error = new Error(message) as CustomError;
  error.statusCode = 400;
  error.isOperational = true;
  return error;
};

const handleValidationErrorDB = (err: any): CustomError => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  const error = new Error(message) as CustomError;
  error.statusCode = 400;
  error.isOperational = true;
  return error;
};

const handleJWTError = (): CustomError => {
  const error = new Error('Invalid token. Please log in again!') as CustomError;
  error.statusCode = 401;
  error.isOperational = true;
  return error;
};

const handleJWTExpiredError = (): CustomError => {
  const error = new Error('Your token has expired! Please log in again.') as CustomError;
  error.statusCode = 401;
  error.isOperational = true;
  return error;
};

const sendErrorDev = (err: CustomError, res: Response) => {
  res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err: CustomError, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode || 500).json({
      status: err.status || 'error',
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

const globalErrorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if ((error as any).code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

export default globalErrorHandler;