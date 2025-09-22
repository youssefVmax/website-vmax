import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: any[];

  constructor(
    statusCode: number,
    message: string,
    isOperational = true,
    errors?: any[],
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', errors?: any[]) {
    super(400, message, true, errors);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message, true);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, message, true);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`, true);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Resource already exists') {
    super(409, message, true);
  }
}

export class ValidationError extends ApiError {
  constructor(errors: any[]) {
    super(422, 'Validation failed', true, errors);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = 'Internal Server Error') {
    super(500, message, false);
  }
}

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default to 500 (Internal Server Error) if status code is not set
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const isOperational = 'isOperational' in err ? err.isOperational : false;
  
  // Log the error
  if (statusCode >= 500) {
    logger.error('Server Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      user: (req as any).user?.id || 'anonymous',
    });
  } else {
    logger.warn('Client Error:', {
      statusCode,
      message: err.message,
      path: req.path,
      method: req.method,
      ip: req.ip,
      user: (req as any).user?.id || 'anonymous',
    });
  }

  // In development, include stack trace in the response
  const response: any = {
    success: false,
    message: err.message || 'Something went wrong',
  };

  if ('errors' in err && err.errors) {
    response.errors = err.errors;
  }

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Send error response
  res.status(statusCode).json(response);

  // If the error is not operational, exit the process
  if (!isOperational) {
    logger.error('Application encountered an uncaught exception:', err);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error | any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  // In production, you might want to restart the process here
  // process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  // In production, you might want to restart the process here
  // process.exit(1);
});

// Handle uncaught exceptions in async code
process.on('uncaughtExceptionMonitor', (error: Error, origin: string) => {
  logger.error('Uncaught Exception Monitor:', { error, origin });
});
