import NodeCache from 'node-cache';
import { logger } from './logger';
import { Request, Response, NextFunction } from 'express';

// Default TTL (Time To Live) in seconds
const DEFAULT_TTL = 300; // 5 minutes
const DEFAULT_CHECK_PERIOD = 60; // 1 minute

// Cache configuration
const cacheConfig = {
  stdTTL: DEFAULT_TTL,
  checkperiod: DEFAULT_CHECK_PERIOD,
  useClones: false, // Set to false for better performance
  deleteOnExpire: true,
  maxKeys: 1000, // Maximum number of keys in the cache
};

// Initialize cache
const cache = new NodeCache(cacheConfig);

// Cache statistics
const cacheStats = {
  hits: 0,
  misses: 0,
  keys: 0,
  ksize: 0,
  vsize: 0,
};

// Update statistics
const updateStats = () => {
  const stats = cache.getStats();
  cacheStats.hits = stats.hits;
  cacheStats.misses = stats.misses;
  cacheStats.keys = cache.keys().length;
  
  // Calculate approximate memory usage
  const keys = cache.keys();
  let keySize = 0;
  let valueSize = 0;
  
  keys.forEach((key: string) => {
    keySize += Buffer.byteLength(JSON.stringify(key), 'utf8');
    const val = cache.get(key);
    if (val !== undefined) {
      valueSize += Buffer.byteLength(JSON.stringify(val), 'utf8');
    }
  });
  
  cacheStats.ksize = keySize;
  cacheStats.vsize = valueSize;
};

// Log cache statistics periodically
setInterval(() => {
  updateStats();
  logger.debug('Cache statistics', cacheStats);
}, 5 * 60 * 1000); // Log every 5 minutes

// Cache middleware for Express
const cacheMiddleware = (ttl: number = DEFAULT_TTL) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      // Clear cache for this route if it's a non-GET request
      const key = req.originalUrl || req.url;
      cache.del(key);
      return next();
    }

    const key = req.originalUrl || req.url;
    
    // Check if the key exists in cache
    const cachedData = cache.get(key);
    
    if (cachedData !== undefined) {
      // Cache hit
      cacheStats.hits++;
      logger.debug(`Cache hit for key: ${key}`);
      
      // Send cached response
      return res.json(cachedData);
    }
    
    // Cache miss
    cacheStats.misses++;
    logger.debug(`Cache miss for key: ${key}`);
    
    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses (status 200)
      if (res.statusCode === 200) {
        // Skip caching if the response is too large (e.g., > 1MB)
        const responseSize = Buffer.byteLength(JSON.stringify(body), 'utf8');
        if (responseSize < 1024 * 1024) { // 1MB
          cache.set(key, body, ttl);
          logger.debug(`Cached response for key: ${key}, TTL: ${ttl}s`);
        } else {
          logger.debug(`Response too large to cache: ${responseSize} bytes`);
        }
      }
      return originalJson(body);
    };
    
    next();
  };
};

// Clear cache by key pattern
const clearCacheByPattern = (pattern: string | RegExp): number => {
  const keys = cache.keys();
  const matchedKeys = keys.filter((key: string) => 
    typeof pattern === 'string' 
      ? key.includes(pattern) 
      : pattern.test(key)
  );
  
  if (matchedKeys.length > 0) {
    const deleted = cache.del(matchedKeys);
    logger.info(`Cleared ${deleted} cache entries matching pattern: ${pattern}`);
    return deleted;
  }
  
  return 0;
};

// Clear entire cache
const clearAllCache = (): void => {
  cache.flushAll();
  logger.info('Cleared all cache entries');};

// Get cache statistics
const getCacheStats = () => {
  updateStats();
  return {
    ...cacheStats,
    hitRate: cacheStats.hits + cacheStats.misses > 0 
      ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100 
      : 0,
    size: (cacheStats.ksize + cacheStats.vsize) / 1024, // in KB
  };
};

// Cache wrapper for async functions
const withCache = async <T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> => {
  // Check cache first
  const cached = cache.get<T>(key);
  if (cached !== undefined) {
    cacheStats.hits++;
    logger.debug(`Cache hit for key: ${key}`);
    return cached;
  }
  
  // Cache miss, execute the function
  cacheStats.misses++;
  logger.debug(`Cache miss for key: ${key}`);
  
  try {
    const result = await fn();
    
    // Only cache if the result is not undefined
    if (result !== undefined) {
      cache.set(key, result, ttl);
      logger.debug(`Cached result for key: ${key}, TTL: ${ttl}s`);
    }
    
    return result;
  } catch (error) {
    logger.error(`Error in withCache for key ${key}:`, error);
    throw error;
  }
};

// Cache middleware for specific routes with custom key generator
const routeCache = (options: {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  shouldCache?: (req: Request, res: Response) => boolean;
}) => {
  const {
    ttl = DEFAULT_TTL,
    keyGenerator = (req) => `${req.method}:${req.originalUrl || req.url}`,
    shouldCache = (req, res) => res.statusCode === 200,
  } = options;
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const key = keyGenerator(req);
    
    // Check cache
    const cached = cache.get(key);
    if (cached !== undefined) {
      cacheStats.hits++;
      logger.debug(`Route cache hit for key: ${key}`);
      return res.json(cached);
    }
    
    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (shouldCache(req, res)) {
        cache.set(key, body, ttl);
        logger.debug(`Cached route response for key: ${key}, TTL: ${ttl}s`);
      }
      return originalJson(body);
    };
    
    next();
  };
};

export {
  cache,
  cacheMiddleware,
  clearCacheByPattern,
  clearAllCache,
  getCacheStats,
  withCache,
  routeCache,
  DEFAULT_TTL,
};
