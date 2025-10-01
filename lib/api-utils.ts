import { z } from 'zod';
import { logger } from './logger';
import { ApiResponseHandler } from './api-response';
import { ApiError, BadRequestError, ValidationError } from './error-handler';

type AsyncRequestHandler = (
  req: any,
  res: any,
  next: any
) => Promise<any>;

/**
 * Wraps an async route handler to catch any unhandled promise rejections
 */
export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: any, res: any, next: any) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validates request against validation rules and handles validation errors
 */
export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: any, res: any, next: any) => {
    try {
      const result = schema.parse(req.body);
      req.validatedData = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Request validation failed', { 
          path: req.path,
          method: req.method,
          errors: error.errors 
        });
        
        return ApiResponseHandler.sendValidationError(res, error.errors, {
          message: 'Validation failed',
          logInfo: {
            action: 'validation_failed',
            userId: (req as any).user?.id,
            resourceId: req.params?.id,
          },
        });
      }
      next(error);
    }
  };
};

/**
 * Handles controller actions with proper error handling and response formatting
 */
export const apiAction = (
  handler: (req: any, res: any, next: any) => Promise<any>,
  options: {
    successMessage?: string;
    successStatus?: number;
    logInfo?: {
      action: string;
      resourceId?: string | ((req: any) => string);
      metadata?: (req: any) => any;
    };
  } = {}
) => {
  return async (req: any, res: any, next: any) => {
    try {
      const result = await handler(req, res, next);
      
      // If headers are already sent, don't send another response
      if (res.headersSent) {
        return;
      }

      const resourceId = typeof options.logInfo?.resourceId === 'function'
        ? options.logInfo.resourceId(req)
        : options.logInfo?.resourceId || req.params.id;
      
      const metadata = options.logInfo?.metadata?.(req);

      // If the handler returned a response, use it
      if (result !== undefined) {
        return ApiResponseHandler.sendSuccess(res, {
          statusCode: options.successStatus || 200,
          message: options.successMessage || 'Operation completed successfully',
          data: result,
          logInfo: options.logInfo ? {
            action: options.logInfo.action,
            userId: (req as any).user?.id,
            resourceId,
            metadata,
          } : undefined,
        });
      }
      
      // If no response was returned but we need to send one
      return ApiResponseHandler.sendSuccess(res, {
        statusCode: options.successStatus || 200,
        message: options.successMessage || 'Operation completed successfully',
        logInfo: options.logInfo ? {
          action: options.logInfo.action,
          userId: (req as any).user?.id,
          resourceId,
          metadata,
        } : undefined,
      });
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to handle 404 Not Found errors
 */
export const notFoundHandler = (req: any, res: any, next: any) => {
  const error = new ApiError(404, `Not Found - ${req.originalUrl}`);
  next(error);
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | ApiError,
  req: any,
  res: any,
  next: any
) => {
  // Log the error for debugging
  logger.error('API Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    params: req.params,
    query: req.query,
    body: req.body,
    user: (req as any).user,
  });

  // Handle different types of errors
  if (err instanceof ValidationError) {
    return ApiResponseHandler.sendValidationError(res, err.errors || [], {
      message: err.message,
      logInfo: {
        action: 'validation_error',
        userId: (req as any).user?.id,
      },
    });
  }

  if (err instanceof BadRequestError) {
    return ApiResponseHandler.sendError(res, {
      statusCode: 400,
      errorCode: 'BAD_REQUEST',
      message: err.message,
      logInfo: {
        action: 'bad_request',
        userId: (req as any).user?.id,
        error: err,
      },
    });
  }

  if (err instanceof ApiError) {
    return ApiResponseHandler.sendError(res, {
      statusCode: err.statusCode,
      errorCode: 'API_ERROR',
      message: err.message,
      details: err.errors,
      logInfo: {
        action: 'api_error',
        userId: (req as any).user?.id,
        error: err,
      },
    });
  }

  // Handle unexpected errors
  return ApiResponseHandler.sendError(res, {
    statusCode: 500,
    errorCode: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? {
      message: err.message,
      stack: err.stack,
    } : undefined,
    logInfo: {
      action: 'unhandled_error',
      userId: (req as any).user?.id,
      error: err,
    },
  });
};

/**
 * Middleware to ensure user is authenticated
 */
export const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) {
    return ApiResponseHandler.sendUnauthorized(res, 'Authentication required', {
      logInfo: {
        action: 'unauthenticated_access',
        userId: (req as any).user?.id,
        ip: req.ip,
      },
    });
  }
  next();
};

/**
 * Middleware to check user roles
 */
export const requireRole = (roles: string | string[]) => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return ApiResponseHandler.sendUnauthorized(res, 'Authentication required', {
        logInfo: {
          action: 'unauthenticated_role_check',
          userId: (req as any).user?.id,
          ip: req.ip,
        },
      });
    }

    const userRoles = (req.user as any).roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return ApiResponseHandler.sendForbidden(res, 'Insufficient permissions', {
        logInfo: {
          action: 'insufficient_permissions',
          userId: (req as any).user?.id,
          ip: req.ip,
          metadata: {
            requiredRoles,
            userRoles,
          },
        },
      });
    }
    
    next();
  };
};

/**
 * Middleware to parse pagination query parameters
 */
export const pagination = (defaultLimit = 10, maxLimit = 100) => {
  return (req: any, res: any, next: any) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      maxLimit,
      Math.max(1, parseInt(req.query.limit as string) || defaultLimit)
    );
    const offset = (page - 1) * limit;

    req.pagination = {
      page,
      limit,
      offset,
    };

    next();
  };
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      pagination?: {
        page: number;
        limit: number;
        offset: number;
      };
      user?: any; // Replace 'any' with your user type
    }
  }
}
