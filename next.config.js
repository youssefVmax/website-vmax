/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix chunk loading issues
  webpack: (config, { dev, isServer }) => {
    // Disable webpack caching in both dev and production
    config.cache = false;
    
    // Fix chunk loading and module resolution
    config.optimization = {
      ...config.optimization,
      moduleIds: 'named',
      chunkIds: 'named',
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 1,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
        },
      },
    };
    
    // Ensure proper module resolution
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve.fallback,
      },
    };
    
    return config;
  },
  
  // Disable static optimization
  trailingSlash: false,
  
  // Disable image optimization caching
  images: {
    unoptimized: true,
  },
  
  // Headers to prevent caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'Surrogate-Control',
            value: 'no-store',
          },
        ],
      },
      {
        // API routes get extra no-cache headers
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'X-Accel-Expires',
            value: '0',
          },
        ],
      },
    ];
  },
  
  // Environment variables
  env: {
    DISABLE_CACHE: 'true',
    FORCE_DYNAMIC: 'true',
  },
  
  // Additional configurations to prevent chunk loading issues
  poweredByHeader: false,
  generateEtags: false,
  
  // Experimental features to improve stability
  experimental: {
    optimizeCss: false,
    optimizePackageImports: [],
  },
};

module.exports = nextConfig;
