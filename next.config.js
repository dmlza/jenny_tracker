/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add cache configuration to handle Webpack caching
  cache: {
    type: 'filesystem',
    cacheDirectory: '.next/cache',
  }
};

module.exports = nextConfig;