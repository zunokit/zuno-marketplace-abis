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
export type ApiKeyDto = Omit<ApiKey, "key" | "start" | "prefix" | "rateLimitEnabled" | "rateLimitTimeWindow" | "rateLimitMax" | "requestCount" | "remaining" | "refillAmount" | "refillInterval" | "lastRefillAt" | "lastRequest">;

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
   * @throws Database errors will be thrown directly, let ApiWrapper handle them
   */
  static async list(params: ApiKeyListParams): Promise<ApiKeyListResult> {
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
  }

  /**
   * Get single API key by ID
   *
   * @throws Database errors will be thrown directly, let ApiWrapper handle them
   */
  static async getById(id: string): Promise<typeof apiKey.$inferSelect | null> {
    const result = await db
      .select()
      .from(apiKey)
      .where(eq(apiKey.id, id))
      .limit(1);

    return result[0] || null;
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
   * @param context - Authentication context
   * @param betterAuthApi - Better Auth API instance
   * @returns Created API key data
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
    },
    betterAuthApi: any
  ) {
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

    // Prepare metadata with scopes
    const metadata = {
      ...input.metadata,
      scopes: input.scopes || [],
    };

    // Call Better Auth API to create key
    const result = await betterAuthApi.createApiKey({
      body: {
        userId: targetUserId,
        name: input.name,
        expiresIn: input.expiresIn,
        permissions: input.permissions,
        metadata,
        rateLimitEnabled: input.rateLimit?.enabled ?? undefined,
        rateLimitMax: input.rateLimit?.max ?? undefined,
        rateLimitTimeWindow: input.rateLimit?.timeWindow ?? undefined,
      },
    });

    // Return formatted response
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
  }
}
