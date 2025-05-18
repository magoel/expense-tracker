import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

interface ApiError extends Error {
  status?: number;
  errors?: any[];
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Set default status code
  const statusCode = err.status || 500;

  // Log error details
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.path} >> ${err.message}`, {
      error: err.stack,
      request: {
        body: req.body,
        query: req.query,
        params: req.params,
      },
    });
  } else {
    logger.warn(`[${req.method}] ${req.path} >> ${err.message}`, {
      error: err.stack,
      request: {
        body: req.body,
        query: req.query,
        params: req.params,
      },
    });
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    errors: err.errors || null,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

export const notFoundHandler = (
  req: Request, 
  res: Response
): void => {
  logger.warn(`Not Found: [${req.method}] ${req.path}`);
  
  res.status(404).json({
    success: false,
    message: `Not Found: ${req.method} ${req.path}`,
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): Promise<void> => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};
