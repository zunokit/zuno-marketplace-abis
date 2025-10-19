import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Database
    DATABASE_URL: z.string().url(),

    // Authentication
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),

    // Cache
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string(),

    // IPFS Storage
    PINATA_JWT: z.string(),
    PINATA_GATEWAY_URL: z.string(),

    // Optional Monitoring
    // SENTRY_DSN: z.string().url().optional(),

    // Public API key issuance
    PUBLIC_API_USER_ID: z.string().optional(),

    // Admin Account (for seed-admin script)
    DEFAULT_ADMIN_EMAIL: z.string().email().optional(),
    DEFAULT_ADMIN_PASSWORD: z.string().min(8).optional(),

    // Foundry Contracts (for seeding ABIs)
    FOUNDRY_OUT_DIR: z.string().default("../zuno-marketplace-contracts/out"),
    FOUNDRY_BROADCAST_DIR: z.string().default("../zuno-marketplace-contracts/broadcast"),

    // Node Environment
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  },

  runtimeEnv: {
    // Server
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    PINATA_JWT: process.env.PINATA_JWT,
    PINATA_GATEWAY_URL: process.env.PINATA_GATEWAY_URL,
    // SENTRY_DSN: process.env.SENTRY_DSN,
    NODE_ENV: process.env.NODE_ENV,

    PUBLIC_API_USER_ID: process.env.PUBLIC_API_USER_ID,
    DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL,
    DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD,

    FOUNDRY_OUT_DIR: process.env.FOUNDRY_OUT_DIR,
    FOUNDRY_BROADCAST_DIR: process.env.FOUNDRY_BROADCAST_DIR,

    // Client
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  emptyStringAsUndefined: true,
});
