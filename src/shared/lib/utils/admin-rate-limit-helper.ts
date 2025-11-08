/**
 * Admin Rate Limit Helpers
 *
 * Utility functions to easily apply rate limiting to admin server actions and API routes.
 *
 * Usage in Server Actions:
 * ```typescript
 * "use server";
 *
 * export async function createAbi(input: CreateAbiDto) {
 *   await withAdminRateLimit(AdminActionLevel.SENSITIVE);
 *
 *   // Your logic here...
 * }
 * ```
 *
 * Usage in API Routes (with ApiWrapper):
 * ```typescript
 * export const POST = ApiWrapper.create(
 *   async (input, context) => {
 *     await checkAdminRateLimit(context.user!.id, AdminActionLevel.CRITICAL);
 *     // Your logic here...
 *   },
 *   {
 *     auth: { required: true, allowSession: true },
 *     rateLimit: { admin: AdminActionLevel.CRITICAL }, // Alternative approach
 *   }
 * );
 * ```
 */

import { auth } from "@/infrastructure/auth/better-auth.config";
import { headers } from "next/headers";
import {
  AdminRateLimitService,
  AdminActionLevel,
  AdminRateLimitError,
} from "@/infrastructure/services/admin-rate-limit.service";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";
import { logger } from "@/shared/lib/utils/logger";

/**
 * Check admin rate limit and throw if exceeded
 *
 * For use in API routes where you have the userId from context.
 *
 * @param userId - User ID from authenticated session
 * @param actionLevel - Sensitivity level of the action
 * @throws ApiError if rate limit exceeded
 *
 * @example
 * ```typescript
 * export const POST = ApiWrapper.create(
 *   async (input, context) => {
 *     await checkAdminRateLimit(context.user!.id, AdminActionLevel.SENSITIVE);
 *
 *     // Proceed with operation...
 *   },
 *   { auth: { required: true, allowSession: true } }
 * );
 * ```
 */
export async function checkAdminRateLimit(
  userId: string,
  actionLevel: AdminActionLevel
): Promise<void> {
  const result = await AdminRateLimitService.checkLimit(userId, actionLevel);

  if (!result.success) {
    // Service error - log and allow (fail open for non-critical paths)
    logger.error("Admin rate limit check failed", {
      userId,
      actionLevel,
      error: result.error,
    } as any);
    return;
  }

  if (!result.data.allowed) {
    // Rate limit exceeded - throw 429
    throw new ApiError(
      `Rate limit exceeded for ${actionLevel} admin actions. Try again in ${result.data.retryAfter} seconds.`,
      ErrorCode.RATE_LIMITED,
      429,
      {
        rateLimit: {
          actionLevel,
          minuteLimit: result.data.minuteLimit,
          hourLimit: result.data.hourLimit,
          minuteRemaining: result.data.minuteRemaining,
          hourRemaining: result.data.hourRemaining,
          minuteReset: result.data.minuteReset,
          hourReset: result.data.hourReset,
          retryAfter: result.data.retryAfter,
        },
      }
    );
  }

  // Check if user is approaching limit (log warning)
  const isNearLimit = await AdminRateLimitService.isNearLimit(
    userId,
    actionLevel,
    0.9 // 90% threshold
  );

  if (isNearLimit) {
    logger.warn("Admin approaching rate limit", {
      userId,
      actionLevel,
      minuteRemaining: result.data.minuteRemaining,
      hourRemaining: result.data.hourRemaining,
    } as any);
  }
}

/**
 * Apply rate limiting to admin server actions
 *
 * Automatically gets the user session and checks rate limit.
 * For use in Next.js Server Actions.
 *
 * @param actionLevel - Sensitivity level of the action
 * @param requireAdmin - Whether to require admin role (default: true)
 * @throws Error if not authenticated, not admin, or rate limit exceeded
 *
 * @example
 * ```typescript
 * "use server";
 *
 * export async function deleteUser(userId: string) {
 *   await withAdminRateLimit(AdminActionLevel.CRITICAL);
 *
 *   // Your logic here...
 * }
 * ```
 */
export async function withAdminRateLimit(
  actionLevel: AdminActionLevel,
  requireAdmin: boolean = true
): Promise<{ userId: string; isAdmin: boolean }> {
  // Get current session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    throw new Error("Authentication required");
  }

  const isAdmin = (session.user as any).role === "admin";

  if (requireAdmin && !isAdmin) {
    throw new Error("Admin access required");
  }

  // Check rate limit
  await checkAdminRateLimit(session.user.id, actionLevel);

  return {
    userId: session.user.id,
    isAdmin,
  };
}

/**
 * Get rate limit headers for response
 *
 * Useful for including rate limit information in API responses.
 *
 * @param userId - User ID
 * @param actionLevel - Action level
 * @returns Headers object with rate limit info
 *
 * @example
 * ```typescript
 * const headers = await getAdminRateLimitHeaders(userId, AdminActionLevel.GENERAL);
 *
 * return new Response(JSON.stringify(data), {
 *   headers: {
 *     'Content-Type': 'application/json',
 *     ...headers,
 *   },
 * });
 * ```
 */
export async function getAdminRateLimitHeaders(
  userId: string,
  actionLevel: AdminActionLevel
): Promise<Record<string, string>> {
  const statsResult = await AdminRateLimitService.getUsageStats(
    userId,
    actionLevel
  );

  if (!statsResult.success || !statsResult.data) {
    return {};
  }

  const { minute, hour } = statsResult.data;

  return {
    "X-RateLimit-Limit-Minute": String(minute.limit),
    "X-RateLimit-Remaining-Minute": String(
      Math.max(0, minute.limit - minute.count)
    ),
    "X-RateLimit-Reset-Minute": String(minute.reset),
    "X-RateLimit-Limit-Hour": String(hour.limit),
    "X-RateLimit-Remaining-Hour": String(Math.max(0, hour.limit - hour.count)),
    "X-RateLimit-Reset-Hour": String(hour.reset),
    "X-RateLimit-Action-Level": actionLevel,
  };
}

/**
 * Decorator-style wrapper for admin server actions
 *
 * @param actionLevel - Sensitivity level
 * @param handler - The actual server action handler
 * @returns Wrapped handler with rate limiting
 *
 * @example
 * ```typescript
 * export const createAbi = withAdminRateLimitWrapper(
 *   AdminActionLevel.SENSITIVE,
 *   async (input: CreateAbiDto) => {
 *     // Your logic here...
 *   }
 * );
 * ```
 */
export function withAdminRateLimitWrapper<T extends (...args: any[]) => any>(
  actionLevel: AdminActionLevel,
  handler: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    await withAdminRateLimit(actionLevel);
    return handler(...args);
  }) as T;
}
