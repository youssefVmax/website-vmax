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
