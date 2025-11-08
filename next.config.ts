import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Disable default body size limit (we handle it in middleware/API wrapper)
  // This allows us to provide better error messages
  experimental: {
    // Note: body parser limit is handled at the route level
  },

  // Server component external packages
  serverExternalPackages: [],
};

export default nextConfig;
