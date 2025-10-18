/**
 * API Key Service
 *
 * Service layer for API key management
 * Separates database operations from route handlers
 *
 * Note: This service throws raw database errors.
 * ApiWrapper at route level will catch and format them properly.
 */

import { db } from "@/infrastructure/database/drizzle/client";
import { apiKey, type ApiKey } from "@/infrastructure/database/drizzle/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";
import {
  tryCatch,
  type TryCatchResult,
} from "@/shared/lib/utils/try-catch-wrapper";

// ============ Types ============

export interface ApiKeyListFilters {
  userId?: string;
  enabled?: boolean;
}

export interface ApiKeyListParams {
  limit: number;
  offset: number;
  filters?: ApiKeyListFilters;
}

/**
 * API Key DTO for list responses
 * Omits sensitive fields like 'key' and 'start'
 */
export type ApiKeyDto = Omit<
  ApiKey,
  | "key"
  | "start"
  | "prefix"
  | "rateLimitEnabled"
  | "rateLimitTimeWindow"
  | "rateLimitMax"
  | "requestCount"
  | "remaining"
  | "refillAmount"
  | "refillInterval"
  | "lastRefillAt"
  | "lastRequest"
>;

export interface ApiKeyListResult {
  keys: ApiKeyDto[];
  total: number;
  limit: number;
  offset: number;
}

// ============ Query Builder Helper ============

/**
 * Reusable query wrapper để apply filters
 * Pattern này giúp code dễ maintain và extend
 */
class QueryBuilder<T> {
  constructor(private query: T) {}

  /**
   * Apply filter conditionally
   * Chỉ apply khi condition = true và filter function được provide
   */
  applyIf(condition: boolean, filterFn: (query: T) => T): QueryBuilder<T> {
    if (condition) {
      this.query = filterFn(this.query);
    }
    return this;
  }

  /**
   * Get final query
   */
  build(): T {
    return this.query;
  }
}

/**
 * Helper factory để tạo QueryBuilder
 */
function buildQuery<T>(initialQuery: T): QueryBuilder<T> {
  return new QueryBuilder(initialQuery);
}

// ============ API Key Service ============

export class ApiKeyService {
  /**
   * List API keys với filtering
   *
   * @example
   * const result = await ApiKeyService.list({
   *   limit: 20,
   *   offset: 0,
   *   filters: { userId: 'user_123' }
   * });
   *
   * @returns TryCatchResult with ApiKeyListResult or ApiError
   */
  static async list(
    params: ApiKeyListParams
  ): Promise<TryCatchResult<ApiKeyListResult>> {
    return tryCatch(
      async () => {
        // Base query
        let query = db
          .select({
            id: apiKey.id,
            name: apiKey.name,
            userId: apiKey.userId,
            enabled: apiKey.enabled,
            permissions: apiKey.permissions,
            metadata: apiKey.metadata,
            expiresAt: apiKey.expiresAt,
            createdAt: apiKey.createdAt,
            updatedAt: apiKey.updatedAt,
          })
          .from(apiKey)
          .limit(params.limit)
          .offset(params.offset);

        // Apply filters using QueryBuilder pattern
        query = buildQuery(query)
          .applyIf(
            !!params.filters?.userId,
            (q) => q.where(eq(apiKey.userId, params.filters!.userId!)) as any
          )
          .applyIf(
            params.filters?.enabled !== undefined,
            (q) => q.where(eq(apiKey.enabled, params.filters!.enabled!)) as any
          )
          .build();

        const keys = await query;

        return {
          keys,
          total: keys.length,
          limit: params.limit,
          offset: params.offset,
        };
      },
      {
        errorMessage: "Failed to list API keys",
        errorCode: ErrorCode.INTERNAL_ERROR,
        context: { params },
      }
    );
  }

  /**
   * Get single API key by ID
   *
   * @returns TryCatchResult with API key or ApiError
   */
  static async getById(
    id: string
  ): Promise<TryCatchResult<typeof apiKey.$inferSelect | null>> {
    return tryCatch(
      async () => {
        const result = await db
          .select()
          .from(apiKey)
          .where(eq(apiKey.id, id))
          .limit(1);

        return result[0] || null;
      },
      {
        errorMessage: "Failed to get API key by ID",
        errorCode: ErrorCode.INTERNAL_ERROR,
        context: { id },
      }
    );
  }

  /**
   * Check if user has access to query specific userId's keys
   */
  static validateUserAccess(
    requestedUserId: string,
    context: {
      user?: { id: string; role: string };
      apiKey?: { userId: string };
    }
  ): void {
    const isAdmin = context.user?.role === "admin";
    const isOwnUser =
      context.user?.id === requestedUserId ||
      context.apiKey?.userId === requestedUserId;

    if (!isAdmin && !isOwnUser) {
      throw new ApiError(
        "You can only list your own API keys unless you're an admin",
        ErrorCode.FORBIDDEN,
        403
      );
    }
  }

  /**
   * Build list params from query input
   * Validates access and normalizes parameters
   */
  static buildListParams(
    input: {
      limit?: number;
      offset?: number;
      userId?: string;
      enabled?: boolean;
    },
    context: {
      user?: { id: string; role: string };
      apiKey?: { userId: string };
    }
  ): ApiKeyListParams {
    const filters: ApiKeyListFilters = {};

    // Validate and add userId filter
    if (input.userId) {
      this.validateUserAccess(input.userId, context);
      filters.userId = input.userId;
    }

    // Add enabled filter
    if (input.enabled !== undefined) {
      filters.enabled = input.enabled;
    }

    return {
      limit: input.limit ?? 20,
      offset: input.offset ?? 0,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };
  }

  /**
   * Create a new API key
   * Handles authorization and delegates to Better Auth
   *
   * @param input - API key creation parameters
   * @param context - Authentication context with request headers
   * @param betterAuthApi - Better Auth API instance
   * @returns TryCatchResult with created API key data or ApiError
   */
  static async create(
    input: {
      name: string;
      userId?: string;
      expiresIn?: number;
      permissions?: Record<string, string[]>;
      metadata?: Record<string, unknown>;
      scopes?: string[];
      rateLimit?: {
        enabled?: boolean;
        max?: number;
        timeWindow?: number;
      };
    },
    context: {
      user?: { id: string; role: string };
      apiKey?: { userId: string };
      request?: { headers: any };
    },
    betterAuthApi: any
  ): Promise<
    TryCatchResult<{
      id: string;
      key: string;
      name: string;
      userId: string;
      expiresAt: Date | null;
      permissions: Record<string, string[]> | null;
      metadata: Record<string, unknown>;
      createdAt: Date;
    }>
  > {
    return tryCatch(
      async () => {
        // Get current user ID from context
        const currentUserId = context.user?.id || context.apiKey?.userId;
        if (!currentUserId) {
          throw new ApiError(
            "User ID not found in authentication context",
            ErrorCode.UNAUTHORIZED,
            401
          );
        }

        // Determine target user ID
        const targetUserId = input.userId || currentUserId;

        // Authorization: Only admins can create keys for other users
        if (input.userId && input.userId !== currentUserId) {
          const isAdmin = context.user?.role === "admin";
          if (!isAdmin) {
            throw new ApiError(
              "Only admins can create API keys for other users",
              ErrorCode.FORBIDDEN,
              403
            );
          }
        }

        // Prepare metadata with scopes and custom fields
        // Store scopes in metadata since Better Auth doesn't have native scope support
        const metadata: Record<string, unknown> = {
          ...(input.metadata || {}),
          scopes: input.scopes || [],
        };

        // Store rate limit config in metadata since Better Auth rate limiting is disabled
        // Our custom RateLimitService will read from metadata instead
        if (input.rateLimit) {
          metadata.rateLimit = input.rateLimit;
        }

        console.log("[ApiKeyService] Creating API key with params:", {
          userId: targetUserId,
          name: input.name,
          expiresIn: input.expiresIn,
          hasPermissions: !!input.permissions,
          hasMetadata: !!metadata,
          hasHeaders: !!context.request?.headers,
        });

        const result = await betterAuthApi.createApiKey({
          body: {
            userId: targetUserId,
            name: input.name,
            expiresIn: input.expiresIn,
            permissions: input.permissions,
            metadata,
            // Note: Rate limiting is disabled in Better Auth config
            // We use custom Redis-based rate limiting in api-handler.ts
          },
          // Headers are not needed for server-side API calls
          // Better Auth API works without them
        });

        console.log("[ApiKeyService] Better Auth response:", result);

        if (!result || !result.id) {
          throw new ApiError(
            "Failed to create API key - invalid response from auth system",
            ErrorCode.INTERNAL_ERROR,
            500
          );
        }

        return {
          id: result.id,
          key: result.key,
          name: result.name,
          userId: result.userId,
          expiresAt: result.expiresAt,
          permissions: result.permissions,
          metadata,
          createdAt: result.createdAt,
        };
      },
      {
        errorMessage: "Failed to create API key",
        errorCode: ErrorCode.INTERNAL_ERROR,
        context: {
          input: { ...input, metadata: undefined }, // Don't log sensitive metadata
          userId: context.user?.id,
          role: context.user?.role,
        },
        onError: (error, context) => {
          console.error("[ApiKeyService] Error creating API key:", {
            name: error instanceof Error ? error.name : "Unknown",
            message: error instanceof Error ? error.message : String(error),
            stack:
              error instanceof Error
                ? error.stack?.split("\n").slice(0, 3)
                : undefined,
            context,
          });
        },
      }
    );
  }
}
