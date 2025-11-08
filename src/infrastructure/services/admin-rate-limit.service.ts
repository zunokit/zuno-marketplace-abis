/**
 * Admin Rate Limiting Service
 *
 * Provides rate limiting for admin endpoints to protect against:
 * - Compromised admin accounts
 * - Accidental abuse (e.g., runaway scripts)
 * - Intentional attacks
 *
 * Rate limits are applied per user session with different tiers based on action sensitivity:
 * - General: Read operations, list queries (100/min, 1000/hr)
 * - Sensitive: Create, update, delete operations (30/min, 300/hr)
 * - Critical: User management, API keys, bulk operations (10/min, 100/hr)
 * - Auth: Authentication attempts (5/min, 20/hr)
 *
 * Uses Redis for distributed, serverless-friendly rate limiting with automatic TTL cleanup.
 *
 * @module AdminRateLimitService
 */

import { Redis } from "@upstash/redis";
import { env } from "@/shared/config/env";
import { appConfig } from "@/shared/config/app.config";
import { logger } from "@/shared/lib/utils/logger";
import {
  tryCatch,
  type TryCatchResult,
} from "@/shared/lib/utils/try-catch-wrapper";
import { ErrorCode } from "@/shared/types";

// ============================================
// Types
// ============================================

/**
 * Admin action levels (sensitivity tiers)
 */
export enum AdminActionLevel {
  GENERAL = "general", // Reads, list operations
  SENSITIVE = "sensitive", // Create, update, delete
  CRITICAL = "critical", // User management, API keys, bulk ops
  AUTH = "auth", // Authentication attempts
}

/**
 * Rate limit result for admin actions
 */
export interface AdminRateLimitResult {
  allowed: boolean;
  actionLevel: AdminActionLevel;
  minuteLimit: number;
  hourLimit: number;
  minuteRemaining: number;
  hourRemaining: number;
  minuteReset: number; // Unix timestamp
  hourReset: number; // Unix timestamp
  retryAfter?: number; // Seconds to wait before retry
}

/**
 * Admin rate limit error
 */
export class AdminRateLimitError extends Error {
  constructor(
    message: string,
    public readonly result: AdminRateLimitResult
  ) {
    super(message);
    this.name = "AdminRateLimitError";
  }
}

// ============================================
// Admin Rate Limit Service
// ============================================

export class AdminRateLimitService {
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
   * Get rate limit configuration for action level
   */
  private static getLimits(level: AdminActionLevel): {
    requestsPerMinute: number;
    requestsPerHour: number;
  } {
    return appConfig.rateLimit.admin[level];
  }

  /**
   * Generate Redis keys for rate limiting
   */
  private static getMinuteKey(userId: string, level: AdminActionLevel): string {
    const now = new Date();
    const minute = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    return `admin:ratelimit:minute:${userId}:${level}:${minute}`;
  }

  private static getHourKey(userId: string, level: AdminActionLevel): string {
    const now = new Date();
    const hour = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    return `admin:ratelimit:hour:${userId}:${level}:${hour}`;
  }

  /**
   * Check rate limit for admin action
   *
   * @param userId - User ID from session
   * @param actionLevel - Sensitivity level of the action
   * @returns TryCatchResult with rate limit result or error
   *
   * @example
   * ```typescript
   * const result = await AdminRateLimitService.checkLimit(
   *   user.id,
   *   AdminActionLevel.SENSITIVE
   * );
   *
   * if (!result.success || !result.data.allowed) {
   *   throw new Error("Rate limit exceeded");
   * }
   * ```
   */
  static async checkLimit(
    userId: string,
    actionLevel: AdminActionLevel
  ): Promise<TryCatchResult<AdminRateLimitResult>> {
    return tryCatch(
      async () => {
        const redis = this.getRedis();
        const limits = this.getLimits(actionLevel);
        const now = Date.now();

        // Generate keys
        const minuteKey = this.getMinuteKey(userId, actionLevel);
        const hourKey = this.getHourKey(userId, actionLevel);

        // Increment counters atomically
        const [minuteCount, hourCount] = await Promise.all([
          redis.incr(minuteKey),
          redis.incr(hourKey),
        ]);

        // Set TTL on first request (60 seconds for minute, 3600 for hour)
        if (minuteCount === 1) {
          await redis.expire(minuteKey, 60);
        }
        if (hourCount === 1) {
          await redis.expire(hourKey, 3600);
        }

        // Calculate reset times
        const minuteReset = Math.ceil(now / 1000 / 60) * 60; // Next minute
        const hourReset = Math.ceil(now / 1000 / 3600) * 3600; // Next hour

        // Check minute limit
        if (minuteCount > limits.requestsPerMinute) {
          const result: AdminRateLimitResult = {
            allowed: false,
            actionLevel,
            minuteLimit: limits.requestsPerMinute,
            hourLimit: limits.requestsPerHour,
            minuteRemaining: 0,
            hourRemaining: Math.max(
              0,
              limits.requestsPerHour - hourCount
            ),
            minuteReset,
            hourReset,
            retryAfter: minuteReset - Math.floor(now / 1000),
          };

          logger.warn("Admin rate limit exceeded (minute)", {
            userId,
            actionLevel,
            minuteCount,
            limit: limits.requestsPerMinute,
            retryAfter: result.retryAfter,
          } as any);

          throw new AdminRateLimitError(
            `Admin rate limit exceeded: ${limits.requestsPerMinute} requests per minute for ${actionLevel} actions`,
            result
          );
        }

        // Check hour limit
        if (hourCount > limits.requestsPerHour) {
          const result: AdminRateLimitResult = {
            allowed: false,
            actionLevel,
            minuteLimit: limits.requestsPerMinute,
            hourLimit: limits.requestsPerHour,
            minuteRemaining: Math.max(
              0,
              limits.requestsPerMinute - minuteCount
            ),
            hourRemaining: 0,
            minuteReset,
            hourReset,
            retryAfter: hourReset - Math.floor(now / 1000),
          };

          logger.warn("Admin rate limit exceeded (hour)", {
            userId,
            actionLevel,
            hourCount,
            limit: limits.requestsPerHour,
            retryAfter: result.retryAfter,
          } as any);

          throw new AdminRateLimitError(
            `Admin rate limit exceeded: ${limits.requestsPerHour} requests per hour for ${actionLevel} actions`,
            result
          );
        }

        // Success - return remaining counts
        return {
          allowed: true,
          actionLevel,
          minuteLimit: limits.requestsPerMinute,
          hourLimit: limits.requestsPerHour,
          minuteRemaining: limits.requestsPerMinute - minuteCount,
          hourRemaining: limits.requestsPerHour - hourCount,
          minuteReset,
          hourReset,
        };
      },
      {
        errorMessage: "Admin rate limit check failed",
        errorCode: ErrorCode.INTERNAL_ERROR,
        context: {
          userId,
          actionLevel,
        },
        onError: (error, context) => {
          // Log errors but don't fail open for admin endpoints
          // Admin actions are sensitive, better to fail safe
          logger.error("Admin rate limit check failed", {
            error,
            context,
          });
        },
      }
    );
  }

  /**
   * Get current usage stats for a user
   *
   * @param userId - User ID from session
   * @param actionLevel - Sensitivity level to check
   * @returns Current usage statistics
   */
  static async getUsageStats(
    userId: string,
    actionLevel: AdminActionLevel
  ): Promise<
    TryCatchResult<{
      minute: { count: number; limit: number; reset: number };
      hour: { count: number; limit: number; reset: number };
    }>
  > {
    return tryCatch(
      async () => {
        const redis = this.getRedis();
        const limits = this.getLimits(actionLevel);
        const now = Date.now();

        const minuteKey = this.getMinuteKey(userId, actionLevel);
        const hourKey = this.getHourKey(userId, actionLevel);

        const [minuteCount, hourCount] = await Promise.all([
          redis.get<number>(minuteKey),
          redis.get<number>(hourKey),
        ]);

        const minuteReset = Math.ceil(now / 1000 / 60) * 60;
        const hourReset = Math.ceil(now / 1000 / 3600) * 3600;

        return {
          minute: {
            count: minuteCount || 0,
            limit: limits.requestsPerMinute,
            reset: minuteReset,
          },
          hour: {
            count: hourCount || 0,
            limit: limits.requestsPerHour,
            reset: hourReset,
          },
        };
      },
      {
        errorMessage: "Failed to get admin usage stats",
        errorCode: ErrorCode.INTERNAL_ERROR,
        context: { userId, actionLevel },
      }
    );
  }

  /**
   * Reset rate limits for a user (super admin function)
   *
   * @param userId - User ID to reset limits for
   * @param actionLevel - Optional: specific level to reset, or all if omitted
   */
  static async resetLimits(
    userId: string,
    actionLevel?: AdminActionLevel
  ): Promise<TryCatchResult<void>> {
    return tryCatch(
      async () => {
        const redis = this.getRedis();

        const levelsToReset = actionLevel
          ? [actionLevel]
          : Object.values(AdminActionLevel);

        for (const level of levelsToReset) {
          const minuteKey = this.getMinuteKey(userId, level);
          const hourKey = this.getHourKey(userId, level);

          await Promise.all([redis.del(minuteKey), redis.del(hourKey)]);
        }

        logger.info("Admin rate limits reset", {
          userId,
          actionLevel: actionLevel || "all",
        } as any);
      },
      {
        errorMessage: "Failed to reset admin rate limits",
        errorCode: ErrorCode.INTERNAL_ERROR,
        context: { userId, actionLevel },
      }
    );
  }

  /**
   * Check if user is close to hitting rate limit (warning threshold)
   *
   * @param userId - User ID from session
   * @param actionLevel - Sensitivity level to check
   * @param threshold - Percentage threshold (0-1), default 0.8 (80%)
   * @returns True if usage is above threshold
   */
  static async isNearLimit(
    userId: string,
    actionLevel: AdminActionLevel,
    threshold: number = 0.8
  ): Promise<boolean> {
    const statsResult = await this.getUsageStats(userId, actionLevel);

    if (!statsResult.success || !statsResult.data) {
      return false;
    }

    const { minute, hour } = statsResult.data;

    const minuteUsage = minute.count / minute.limit;
    const hourUsage = hour.count / hour.limit;

    return minuteUsage >= threshold || hourUsage >= threshold;
  }
}
