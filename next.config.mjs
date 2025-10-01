/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizeCss: false,
  },
  // Force development mode to see unminified errors
  productionBrowserSourceMaps: true,
  
  // Fix webpack cache warnings
  webpack: (config, { isServer, dev }) => {
    // Disable snapshot caching to prevent cache warnings
    config.snapshot = {
      managedPaths: [],
      immutablePaths: [],
      buildDependencies: {
        hash: false,
        timestamp: false,
      },
    };
    
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
      };
    }
    
    // Disable minification in development
    if (dev) {
      config.optimization = {
        ...config.optimization,
        minimize: false,
      };
    }
    
    return config;
  },
  // Add CORS headers for development
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ];
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
      };
    }
    // Disable minification in development
    if (dev) {
      config.optimization = {
        ...config.optimization,
        minimize: false,
      };
    }
    return config;
  },
}

export default nextConfig
