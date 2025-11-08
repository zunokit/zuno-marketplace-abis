import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API Routes timeout configuration (in seconds)
  // Note: Vercel Hobby plan has 10s limit, Pro has 60s, Enterprise has 300s
  experimental: {
    // Set max duration for API routes (applies to all routes unless overridden)
    // Default: 10s for Vercel Hobby, 300s for self-hosted
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Server component external packages
  serverExternalPackages: [],

  // Headers for timeout control
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Request-Timeout',
            value: '30000', // 30 seconds in milliseconds
          },
        ],
      },
    ];
  },
};

export default nextConfig;
