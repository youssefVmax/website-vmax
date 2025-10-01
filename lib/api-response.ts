import { Response } from 'express';
import { logger } from './logger';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  error?: {
    code: string | number;
    message: string;
    details?: any;
  };
}

interface ResponseOptions {
  statusCode?: number;
  message?: string;
  data?: any;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  logInfo?: {
    action: string;
    userId?: string | number;
    resourceId?: string | number;
    metadata?: any;
  };
}

class ApiResponseHandler {
  /**
   * Send a successful API response
   */
  public static sendSuccess(
    res: Response,
    options: ResponseOptions = {}
  ): void {
    const {
      statusCode = 200,
      message = 'Operation completed successfully',
      data = null,
      meta,
      logInfo,
    } = options;

    // Prepare meta for pagination
    let paginationMeta = meta;
    if (meta && meta.page && meta.limit && meta.total !== undefined) {
      paginationMeta = {
        ...meta,
        totalPages: Math.ceil(meta.total / meta.limit),
      };
    }

    const response: ApiResponse = {
      success: true,
      message,
      data,
      meta: paginationMeta,
    };

    // Log successful operation if logInfo is provided
    if (logInfo) {
      logger.info(logInfo.action, {
        userId: logInfo.userId,
        resourceId: logInfo.resourceId,
        status: 'success',
        statusCode,
        metadata: logInfo.metadata,
      });
    }

    res.status(statusCode).json(response);
  }

  /**
   * Send an error response
   */
  public static sendError(
    res: Response,
    options: {
      statusCode?: number;
      errorCode?: string | number;
      message: string;
      details?: any;
      logInfo?: {
        action: string;
        userId?: string | number;
        resourceId?: string | number;
        error: Error | any;
      };
    }
  ): void {
    const {
      statusCode = 500,
      errorCode = 'INTERNAL_ERROR',
      message = 'An unexpected error occurred',
      details = null,
      logInfo,
    } = options;

    const response: ApiResponse = {
      success: false,
      message,
      error: {
        code: errorCode,
        message,
        details,
      },
    };

    // Log error if logInfo is provided
    if (logInfo) {
      const error = logInfo.error;
      const errorDetails = {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        status: error?.status,
        statusCode: error?.statusCode,
      };

      logger.error(logInfo.action, {
        userId: logInfo.userId,
        resourceId: logInfo.resourceId,
        status: 'error',
        statusCode,
        error: errorDetails,
      });
    }

    res.status(statusCode).json(response);
  }

  /**
   * Send a validation error response
   */
  public static sendValidationError(
    res: Response,
    errors: any[],
    options: {
      message?: string;
      logInfo?: {
        action: string;
        userId?: string | number;
        resourceId?: string | number;
      };
    } = {}
  ): void {
    const { message = 'Validation failed', logInfo } = options;

    const response: ApiResponse = {
      success: false,
      message,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        details: errors,
      },
    };

    // Log validation error if logInfo is provided
    if (logInfo) {
      logger.warn('Validation Error', {
        userId: logInfo.userId,
        resourceId: logInfo.resourceId,
        status: 'validation_error',
        statusCode: 400,
        validationErrors: errors,
        action: logInfo.action,
      });
    }

    res.status(400).json(response);
  }

  /**
   * Send a not found response
   */
  public static sendNotFound(
    res: Response,
    message: string = 'Resource not found',
    options: {
      logInfo?: {
        action: string;
        userId?: string | number;
        resourceId?: string | number;
      };
    } = {}
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      error: {
        code: 'NOT_FOUND',
        message,
      },
    };

    // Log not found if logInfo is provided
    if (options.logInfo) {
      logger.warn('Resource Not Found', {
        userId: options.logInfo.userId,
        resourceId: options.logInfo.resourceId,
        status: 'not_found',
        statusCode: 404,
        action: options.logInfo.action,
      });
    }

    res.status(404).json(response);
  }

  /**
   * Send an unauthorized response
   */
  public static sendUnauthorized(
    res: Response,
    message: string = 'Unauthorized',
    options: {
      logInfo?: {
        action: string;
        userId?: string | number;
        ip?: string;
      };
    } = {}
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      error: {
        code: 'UNAUTHORIZED',
        message,
      },
    };

    // Log unauthorized access if logInfo is provided
    if (options.logInfo) {
      logger.warn('Unauthorized Access', {
        userId: options.logInfo.userId,
        ip: options.logInfo.ip,
        status: 'unauthorized',
        statusCode: 401,
        action: options.logInfo.action,
      });
    }

    res.status(401).json(response);
  }

  public static sendForbidden(
    res: Response,
    message: string = 'Forbidden',
    options: {
      logInfo?: {
        action: string;
        userId?: string | number;
        resourceId?: string | number;
        ip?: string;
        metadata?: any;
      };
    } = {}
  ): void {
    const response: ApiResponse = {
      success: false,
      message,
      error: {
        code: 'FORBIDDEN',
        message,
      },
    };

    // Log forbidden access if logInfo is provided
    if (options.logInfo) {
      logger.warn('Forbidden Access', {
        userId: options.logInfo.userId,
        resourceId: options.logInfo.resourceId,
        ip: options.logInfo.ip,
        status: 'forbidden',
        statusCode: 403,
        action: options.logInfo.action,
      });
    }

    res.status(403).json(response);
  }
}

export type { ApiResponse };
export { ApiResponseHandler };
