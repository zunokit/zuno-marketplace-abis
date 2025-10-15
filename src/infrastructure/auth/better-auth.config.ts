import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { apiKey, openAPI, bearer } from "better-auth/plugins";
import { db } from "@/infrastructure/database/drizzle/client";
import { env } from "@/shared/config/env";
import { appConfig } from "@/shared/config/app.config";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  // Email provider configuration
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // User configuration
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        input: false, // Don't allow user to set this
      },
    },
  },

  // Global rate limiting configuration
  rateLimit: {
    enabled: true,
    window: 60, // 60 seconds
    max: 100, // 100 requests per minute per IP
    storage: "database", // Store rate limit data in database
  },

  plugins: [
    // Admin plugin for user management
    admin(),

    // Bearer token plugin (enables Authorization: Bearer <session-token>)
    bearer({
      // requireSignature: false // optional
    }),

    // API Key plugin for programmatic access
    apiKey({
      // Rate limiting per API key
      rateLimit: {
        enabled: true,
        timeWindow: appConfig.rateLimit.free.window * 1000, // Convert to ms
        maxRequests: appConfig.rateLimit.free.requests,
      },

      // Permissions system - Better Auth format (resource: ['action'])
      // We'll also support scope format (resource:action) in metadata
      permissions: {
        defaultPermissions: {
          abis: ["read", "list"],
          contracts: ["read", "list"],
          networks: ["read", "list"],
        },
      },

      // Enable metadata for custom business logic
      enableMetadata: true,

      // Default key configuration
      defaultPrefix: "zuno_",
      defaultKeyLength: 32,
    }),

    // OpenAPI documentation
    openAPI({
      path: "/api/auth/reference",
    }),
  ],

  // Advanced security options
  advanced: {
    // CSRF protection
    crossSubDomainCookies: {
      enabled: false,
    },

    // Generate secure session tokens
    generateId: () => crypto.randomUUID(),
  },

  // CORS configuration
  cors: {
    origin: [env.NEXT_PUBLIC_APP_URL],
    credentials: true,
  },
});
