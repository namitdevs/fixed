import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error(`Unhandled Error on ${req.method} ${req.url}:`, err);

  // Zod Validation Error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Input validation failed',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Known custom errors
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected internal error occurred';

  res.status(statusCode).json({
    success: false,
    errorCode,
    message,
  });
}
