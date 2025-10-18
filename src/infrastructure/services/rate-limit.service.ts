import { Redis } from "@upstash/redis";
import { env } from "@/shared/config/env";
import { logger } from "@/shared/lib/utils/logger";
import type { AuthApiKey } from "@/infrastructure/auth/auth-helpers";
import {
  tryCatch,
  type TryCatchResult,
} from "@/shared/lib/utils/try-catch-wrapper";
import { ErrorCode } from "@/shared/types";

/**
 * Rate Limiting Service with Upstash Redis
 *
 * Hybrid approach:
 * - Layer 1: Better Auth built-in rate limiting (per API key, database)
 * - Layer 2: Custom business logic with Redis (IP, Origin, Tier-based, Daily limits)
 *
 * Benefits of Redis:
 * - Fast in-memory operations
 * - Atomic increment operations
 * - TTL support for automatic cleanup
 * - Distributed rate limiting (serverless-friendly)
 *
 * @module RateLimitService
 */

/**
 * Rate limit tiers
 */
export enum RateLimitTier {
  PUBLIC = "public",
  FREE = "free",
  PRO = "pro",
  ENTERPRISE = "enterprise",
}

/**
 * Rate limit configuration per tier
 */
export interface RateLimitConfig {
  tier: RateLimitTier;
  limits: {
    requestsPerHour: number;
    requestsPerDay: number;
    burst?: number; // Burst allowance (tokens bucket)
  };
  restrictions?: {
    ipWhitelist?: string[];
    allowedOrigins?: string[];
  };
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  tier: RateLimitTier;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when limit resets
  retryAfter?: number; // Seconds to wait before retry
}

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  constructor(message: string, public readonly result: RateLimitResult) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Rate Limiting Service
 */
export class RateLimitService {
  private static redis: Redis | null = null;

  /**
   * Initialize Redis connection
   */
  private static getRedis(): Redis {
    if (!this.redis) {
      this.redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });
    }
    return this.redis;
  }

  /**
   * Get tier configuration
   */
  private static getTierConfig(tier: RateLimitTier): RateLimitConfig {
    const configs: Record<RateLimitTier, RateLimitConfig> = {
      [RateLimitTier.PUBLIC]: {
        tier: RateLimitTier.PUBLIC,
        limits: {
          requestsPerHour: 100,
          requestsPerDay: 1000,
        },
      },
      [RateLimitTier.FREE]: {
        tier: RateLimitTier.FREE,
        limits: {
          requestsPerHour: 500,
          requestsPerDay: 5000,
        },
      },
      [RateLimitTier.PRO]: {
        tier: RateLimitTier.PRO,
        limits: {
          requestsPerHour: 5000,
          requestsPerDay: 100000,
          burst: 100,
        },
      },
      [RateLimitTier.ENTERPRISE]: {
        tier: RateLimitTier.ENTERPRISE,
        limits: {
          requestsPerHour: Infinity,
          requestsPerDay: Infinity,
        },
      },
    };

    return configs[tier];
  }

  /**
   * Extract tier from API key metadata
   */
  private static getKeyTier(apiKey: AuthApiKey): RateLimitTier {
    const metadataType = apiKey.metadata?.type;

    // Map metadata type to tier
    switch (metadataType) {
      case "public":
        return RateLimitTier.PUBLIC;
      case "personal":
        return RateLimitTier.FREE;
      case "organization":
        return RateLimitTier.PRO;
      default:
        return RateLimitTier.FREE;
    }
  }

  /**
   * Check if IP is in whitelist
   */
  private static isIpAllowed(ip: string, whitelist: string[]): boolean {
    if (whitelist.length === 0) return true;

    return whitelist.some((allowedIp) => {
      // Support CIDR notation (simplified)
      if (allowedIp.includes("/")) {
        const [network] = allowedIp.split("/");
        const networkPrefix = network.substring(0, network.lastIndexOf("."));
        return ip.startsWith(networkPrefix);
      }
      return ip === allowedIp;
    });
  }

  /**
   * Check if origin is allowed
   */
  private static isOriginAllowed(
    origin: string | undefined,
    allowedOrigins: string[]
  ): boolean {
    if (allowedOrigins.length === 0) return true;
    if (!origin) return false;

    return allowedOrigins.includes(origin);
  }

  /**
   * Redis key generators
   */
  private static getHourlyKey(apiKeyId: string): string {
    const now = new Date();
    const hour = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    return `ratelimit:hourly:${apiKeyId}:${hour}`;
  }

  private static getDailyKey(apiKeyId: string): string {
    const now = new Date();
    const day = now.toISOString().slice(0, 10); // YYYY-MM-DD
    return `ratelimit:daily:${apiKeyId}:${day}`;
  }

  /**
   * Check rate limit for an API key
   *
   * @param apiKey - API key to check
   * @param request - Request context (IP, origin)
   * @returns TryCatchResult with rate limit result or ApiError
   */
  static async checkLimit(
    apiKey: AuthApiKey,
    request: {
      ip: string;
      origin?: string;
    }
  ): Promise<TryCatchResult<RateLimitResult>> {
    return tryCatch(
      async () => {
        // Get tier and config
        const tier = this.getKeyTier(apiKey);
        const config = this.getTierConfig(tier);

        // Enterprise tier - unlimited
        if (tier === RateLimitTier.ENTERPRISE) {
          return {
            allowed: true,
            tier,
            limit: Infinity,
            remaining: Infinity,
            reset: 0,
          };
        }

        // Check IP whitelist
        if (config.restrictions?.ipWhitelist) {
          if (!this.isIpAllowed(request.ip, config.restrictions.ipWhitelist)) {
            const result: RateLimitResult = {
              allowed: false,
              tier,
              limit: 0,
              remaining: 0,
              reset: 0,
            };
            throw new RateLimitError("IP address not in whitelist", result);
          }
        }

        // Check origin restriction
        if (config.restrictions?.allowedOrigins) {
          if (
            !this.isOriginAllowed(
              request.origin,
              config.restrictions.allowedOrigins
            )
          ) {
            const result: RateLimitResult = {
              allowed: false,
              tier,
              limit: 0,
              remaining: 0,
              reset: 0,
            };
            throw new RateLimitError("Origin not allowed", result);
          }
        }

        const redis = this.getRedis();
        const now = Date.now();

        // Check hourly limit
        const hourlyKey = this.getHourlyKey(apiKey.id);
        const hourlyCount = await redis.incr(hourlyKey);

        // Set TTL on first request of the hour (1 hour)
        if (hourlyCount === 1) {
          await redis.expire(hourlyKey, 3600);
        }

        if (hourlyCount > config.limits.requestsPerHour) {
          const hourlyReset = Math.ceil(now / 1000 / 3600) * 3600; // Next hour
          const result: RateLimitResult = {
            allowed: false,
            tier,
            limit: config.limits.requestsPerHour,
            remaining: 0,
            reset: hourlyReset,
            retryAfter: hourlyReset - Math.floor(now / 1000),
          };
          throw new RateLimitError("Hourly rate limit exceeded", result);
        }

        // Check daily limit
        const dailyKey = this.getDailyKey(apiKey.id);
        const dailyCount = await redis.incr(dailyKey);

        // Set TTL on first request of the day (24 hours)
        if (dailyCount === 1) {
          await redis.expire(dailyKey, 86400);
        }

        if (dailyCount > config.limits.requestsPerDay) {
          const dailyReset = Math.ceil(now / 1000 / 86400) * 86400; // Next day
          const result: RateLimitResult = {
            allowed: false,
            tier,
            limit: config.limits.requestsPerDay,
            remaining: 0,
            reset: dailyReset,
            retryAfter: dailyReset - Math.floor(now / 1000),
          };
          throw new RateLimitError("Daily rate limit exceeded", result);
        }

        // Success - return remaining counts
        const hourlyReset = Math.ceil(now / 1000 / 3600) * 3600;
        return {
          allowed: true,
          tier,
          limit: config.limits.requestsPerHour,
          remaining: config.limits.requestsPerHour - hourlyCount,
          reset: hourlyReset,
        };
      },
      {
        errorMessage: "Rate limit check failed",
        errorCode: ErrorCode.INTERNAL_ERROR,
        context: {
          apiKeyId: apiKey.id,
          tier: this.getKeyTier(apiKey),
          ip: request.ip,
          origin: request.origin,
        },
        onError: (error, context) => {
          // Log other errors but allow request (fail open)
          logger.error("Rate limit check failed, allowing request", {
            error,
            context,
          });
        },
      }
    );
  }

  /**
   * Get current usage stats for an API key
   */
  static async getUsageStats(apiKeyId: string): Promise<
    TryCatchResult<{
      hourly: { count: number; limit: number; reset: number };
      daily: { count: number; limit: number; reset: number };
    }>
  > {
    return tryCatch(
      async () => {
        const redis = this.getRedis();
        const now = Date.now();

        const hourlyKey = this.getHourlyKey(apiKeyId);
        const dailyKey = this.getDailyKey(apiKeyId);

        const [hourlyCount, dailyCount] = await Promise.all([
          redis.get<number>(hourlyKey),
          redis.get<number>(dailyKey),
        ]);

        const hourlyReset = Math.ceil(now / 1000 / 3600) * 3600;
        const dailyReset = Math.ceil(now / 1000 / 86400) * 86400;

        return {
          hourly: {
            count: hourlyCount || 0,
            limit: 500, // Default, should get from tier
            reset: hourlyReset,
          },
          daily: {
            count: dailyCount || 0,
            limit: 5000, // Default, should get from tier
            reset: dailyReset,
          },
        };
      },
      {
        errorMessage: "Failed to get usage stats",
        errorCode: ErrorCode.INTERNAL_ERROR,
        context: { apiKeyId },
      }
    );
  }

  /**
   * Reset rate limits for an API key (admin function)
   */
  static async resetLimits(apiKeyId: string): Promise<TryCatchResult<void>> {
    return tryCatch(
      async () => {
        const redis = this.getRedis();

        const hourlyKey = this.getHourlyKey(apiKeyId);
        const dailyKey = this.getDailyKey(apiKeyId);

        await Promise.all([redis.del(hourlyKey), redis.del(dailyKey)]);

        logger.info(`Rate limits reset for API key: ${apiKeyId}`);
      },
      {
        errorMessage: "Failed to reset rate limits",
        errorCode: ErrorCode.INTERNAL_ERROR,
        context: { apiKeyId },
      }
    );
  }
}
