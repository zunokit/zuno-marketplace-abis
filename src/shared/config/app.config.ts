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