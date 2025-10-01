import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from './logger';
import { ApiResponseHandler } from './api-response';

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request, res: Response) => boolean;
  onLimitReached?: (req: Request, res: Response, options: any) => void;
}

/**
 * Creates a rate limiter middleware with Redis or in-memory store
 */
export const createRateLimiter = (options: RateLimitOptions = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests, please try again later.',
    keyGenerator = (req: Request) => req.ip || 'unknown', // default to IP-based limiting
    skip = () => false, // function to skip rate limiting
    onLimitReached = (req: Request, res: Response, options: any) => {
      logger.warn('Rate limit reached', {
        ip: req.ip,
        method: req.method,
        path: req.path,
        limit: options.max,
        windowMs: options.windowMs,
      });
    },
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    keyGenerator,
    skip,
    handler: (req: Request, res: Response) => {
      // Log the rate limit event
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        method: req.method,
        path: req.path,
        action: 'rate_limit_exceeded'
      });

      return ApiResponseHandler.sendError(res, {
        statusCode: 429,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: message,
        logInfo: {
          action: 'rate_limit_exceeded',
          error: new Error(`Rate limit exceeded for IP: ${req.ip}`),
        },
      });
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
};

/**
 * Default rate limiter for public API endpoints
 */
export const defaultRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

/**
 * Stricter rate limiter for authentication endpoints
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 requests per hour
  message: 'Too many login attempts, please try again after an hour',
  keyGenerator: (req: Request) => {
    // Use both IP and username for rate limiting auth endpoints
    const username = req.body.username || 'unknown';
    return `${req.ip || 'unknown'}:${username}`;
  },
});

/**
 * Rate limiter for sensitive operations (password reset, etc.)
 */
export const sensitiveOperationRateLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // limit each user to 3 requests per day
  message: 'Too many attempts, please try again tomorrow',
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    return (req as any).user?.id || req.ip || 'unknown';
  },
});

/**
 * Rate limiter for public file uploads
 */
export const fileUploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit to 10 file uploads per hour
  message: 'Too many file uploads, please try again later',
});

/**
 * Rate limiter for API key-based authentication
 */
export const apiKeyRateLimiter = (apiKey: string, options: RateLimitOptions = {}) => {
  return createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // 1000 requests per hour per API key
    keyGenerator: (req: Request) => {
      // Extract API key from header, query param, or body
      const apiKey = 
        req.headers['x-api-key'] || 
        req.query.api_key || 
        (req.body && req.body.api_key);
      return `api-key:${apiKey || 'unknown'}`;
    },
    skip: (req: Request) => {
      // Skip rate limiting for requests with a valid API key
      const reqApiKey = 
        req.headers['x-api-key'] || 
        req.query.api_key || 
        (req.body && req.body.api_key);
      return reqApiKey !== apiKey;
    },
    ...options,
  });
};

/**
 * Rate limiter for admin operations
 */
export const adminRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit to 50 requests per 5 minutes
  skip: (req: Request) => {
    // Skip rate limiting for admin users
    return !!(req as any).user?.isAdmin;
  },
});

/**
 * Rate limiter for public endpoints with IP-based blocking
 */
export const publicEndpointRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500, // limit each IP to 500 requests per hour
  message: 'Too many requests from this IP, please try again later',
});

// Export rate limit store for distributed environments
// In production, you might want to use Redis for distributed rate limiting
export { MemoryStore } from 'express-rate-limit';

// Example Redis store implementation
/*
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

await redisClient.connect();

export const redisRateLimiter = createRateLimiter({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
*/
