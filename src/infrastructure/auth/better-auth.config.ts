import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { apiKey, openAPI, bearer } from "better-auth/plugins";
import { db } from "@/infrastructure/database/drizzle/client";
import * as drizzleSchema from "@/infrastructure/database/drizzle/schema";
import { env } from "@/shared/config/env";
import { appConfig } from "@/shared/config/app.config";
import { IdGenerator, EntityPrefix } from "@/shared/lib/utils/id-generator";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    // Pass a minimal, explicit schema and include adapter's expected alias keys
    schema: {
      ...drizzleSchema,
      apikey: drizzleSchema.apiKey,
      rateLimit: drizzleSchema.rateLimit, // For global rate limiting (per IP)
    },
  }),

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  // Email provider configuration
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false, // Allow login without email verification
    disableSignUp: true, // Disable public signup - admin creates accounts
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

  // Global rate limiting (per IP/session)
  // Protects server from DDoS and brute force attacks
  // This is DIFFERENT from API key rate limiting (which uses Redis)
  rateLimit: {
    enabled: true,
    window: 60, // 60 seconds
    max: 100, // 100 requests per minute per IP
    storage: "database", // Store in database
    modelName: "rateLimit",
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
      // Rate limiting - DISABLED
      // We use custom Redis-based RateLimitService in api-handler.ts instead
      // This provides tier-based limits and distributed rate limiting via Upstash
      rateLimit: {
        enabled: false, // Disabled - using custom Redis implementation
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

    openAPI(),
  ],

  // Advanced security options
  advanced: {
    // CSRF protection
    crossSubDomainCookies: {
      enabled: false,
    },
    // Use friendly IDs with default v1
    // Note: Better Auth generateId doesn't have request context access
    // So we default to v1 for auth entities (user, session, etc.)
    database: {
      generateId: (opts) => {
        const model = opts?.model;
        const apiVersion = 'v1'; // Default for auth entities

        switch (model) {
          case 'user':
            return IdGenerator.generate({ prefix: EntityPrefix.USER, apiVersion });
          case 'session':
            return IdGenerator.generate({ prefix: EntityPrefix.SESSION, apiVersion });
          case 'verification':
            return IdGenerator.generate({ prefix: EntityPrefix.VERIFICATION, apiVersion });
          case 'account':
            return IdGenerator.generate({ prefix: EntityPrefix.ACCOUNT, apiVersion });
          case 'apiKey':
            return IdGenerator.generate({ prefix: EntityPrefix.API_KEY, apiVersion });
          default:
            return IdGenerator.generate({ prefix: EntityPrefix.USER, apiVersion });
        }
      },
    },
  },

  // CORS configuration
  cors: {
    origin: [env.NEXT_PUBLIC_APP_URL],
    credentials: true,
  },
});
