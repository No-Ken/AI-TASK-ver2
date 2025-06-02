import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(error: any, req: Request, res: Response, next: NextFunction) {
  logger.error('API Error:', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers,
  });

  // Zod validation errors
  if (error.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation error',
      details: error.errors,
    });
  }

  // Custom API errors
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      error: error.message,
    });
  }

  // Database errors
  if (error.code === 'permission-denied') {
    return res.status(403).json({
      error: 'Permission denied',
    });
  }

  if (error.code === 'not-found') {
    return res.status(404).json({
      error: 'Resource not found',
    });
  }

  // Default server error
  res.status(500).json({
    error: 'Internal server error',
  });
}