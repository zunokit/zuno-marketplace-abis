import { env } from "./env";

export const appConfig = {
  // API Configuration
  api: {
    version: "v1",
    defaultPageSize: 20,
    maxPageSize: 100,
    timeout: 30000,
  },

  // Rate Limiting
  rateLimit: {
    free: {
      requests: 100,
      window: 3600, // 1 hour in seconds
    },
    pro: {
      requests: 1000,
      window: 3600,
    },
    enterprise: {
      requests: 10000,
      window: 3600,
    },
  },

  // Request/Response Logging
  logging: {
    // Enable request/response logging
    enabled: env.NODE_ENV !== "test", // Disable in test environment

    // Log request body (may contain sensitive data)
    includeRequestBody: env.NODE_ENV === "development",

    // Log response body (may be large)
    includeResponseBody: env.NODE_ENV === "development",

    // Log health check requests (can be noisy)
    logHealthChecks: false,

    // Log slow requests (requests taking longer than threshold)
    slowRequestThreshold: 1000, // 1 second in milliseconds

    // Log large responses (responses larger than threshold)
    largeResponseThreshold: 10000, // 10KB in bytes

    // Exclude paths from logging (regex patterns)
    excludePaths: [
      "^/_next/", // Next.js internal routes
      "^/static/", // Static assets
      "\\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf)$", // File extensions
    ],

    // Sample rate for logging (0.0 to 1.0, 1.0 = log all requests)
    // Useful for high-traffic production environments
    sampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0, // 10% in prod, 100% in dev
  },

  // Cache TTL (in seconds)
  cache: {
    abi: 3600, // 1 hour
    contract: 3600, // 1 hour
    search: 300, // 5 minutes
    network: 86400, // 24 hours
  },

  // IPFS Configuration
  ipfs: {
    timeout: 60000, // 1 minute
    retries: 3,
    groups: {
      abis: 'marketplace-abis', // Group name for all ABIs
      contracts: 'marketplace-contracts', // Group for contract-related files
      metadata: 'marketplace-metadata', // Group for metadata files
    },
  },

  // Database
  database: {
    connectionTimeout: 30000,
    queryTimeout: 60000,
  },

  // File Upload
  upload: {
    maxFileSize: 1024 * 1024, // 1MB for ABI JSON
    allowedFormats: ["application/json"],
  },

  // URLs
  urls: {
    app: env.NEXT_PUBLIC_APP_URL,
    api: `${env.NEXT_PUBLIC_APP_URL}/api`,
    docs: `${env.NEXT_PUBLIC_APP_URL}/docs`,
  },

  // Features
  features: {
    sentry: false, // !!env.SENTRY_DSN when enabled
    analytics: env.NODE_ENV === "production",
    debugMode: env.NODE_ENV === "development",
  },
} as const;

export type AppConfig = typeof appConfig;