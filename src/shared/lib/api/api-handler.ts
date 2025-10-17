import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/shared/types";
import {
  verifyApiKey,
  verifySession,
  verifySessionFromHeaders,
  hasPermission,
  isAdmin,
  canAccessResource,
  type AuthContext,
  type AuthUser,
  type AuthApiKey,
} from "@/infrastructure/auth/auth-helpers";
import { RateLimitService, RateLimitError } from "@/infrastructure/services/rate-limit.service";
import { logger } from "@/shared/lib/utils/logger";

export interface ApiContext extends AuthContext {
  request: NextRequest;
  params?: Record<string, string>;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

export type ApiHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: ApiContext
) => Promise<TOutput>;

export interface ApiRouteConfig {
  auth?: {
    required?: boolean;
    allowApiKey?: boolean;
    allowSession?: boolean;
    requiredPermissions?: string[];
  };
  validation?: {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
  };
  rateLimit?: {
    max: number;
    window: number;
  };
}

export class ApiWrapper {
  static create<TInput = unknown, TOutput = unknown>(
    handler: ApiHandler<TInput, TOutput>,
    config: ApiRouteConfig = {}
  ) {
    return async (
      request: NextRequest,
      context?: { params?: Promise<Record<string, string>> }
    ) => {
      try {
        // 1. Parse and validate request data
        const params = context?.params ? await context.params : {};
        const parsedData = await this.parseRequest(
          request,
          config.validation,
          params
        );

        // 2. Create API context
        const apiContext: ApiContext = {
          request,
          params,
        };

        // 3. Handle authentication if required
        if (config.auth?.required !== false) {
          await this.handleAuth(apiContext, config.auth);
        }

        // 4. Execute the handler
        const result = await handler(parsedData as TInput, apiContext);

        // 5. Return success response
        const response = NextResponse.json(createSuccessResponse(result), {
          status: 200,
        });

        // Add rate limit headers if available
        if (apiContext.rateLimit) {
          response.headers.set(
            "X-RateLimit-Limit",
            apiContext.rateLimit.limit.toString()
          );
          response.headers.set(
            "X-RateLimit-Remaining",
            apiContext.rateLimit.remaining.toString()
          );
          response.headers.set(
            "X-RateLimit-Reset",
            apiContext.rateLimit.reset.toString()
          );
        }

        return response;
      } catch (error) {
        return this.handleError(error);
      }
    };
  }

  private static async parseRequest(
    request: NextRequest,
    validation?: ApiRouteConfig["validation"],
    routeParams: Record<string, string> = {}
  ) {
    const url = new URL(request.url);
    const method = request.method;

    let body: unknown = undefined;
    let query: Record<string, string> = {};
    let params: Record<string, string> = routeParams;

    // Parse query parameters
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    // Parse body for POST/PUT/PATCH requests
    if (["POST", "PUT", "PATCH"].includes(method)) {
      const contentType = request.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        body = await request.json();
      }
    }

    // Validate using Zod schemas if provided
    if (validation?.query) {
      query = validation.query.parse(query) as Record<string, string>;
    }

    if (validation?.body && body !== undefined) {
      body = validation.body.parse(body);
    }

    if (validation?.params && params) {
      params = validation.params.parse(params) as Record<string, string>;
    }

    return {
      body,
      query,
      params,
      method,
      headers: Object.fromEntries(request.headers.entries()),
    };
  }

  private static async handleAuth(
    context: ApiContext,
    authConfig?: ApiRouteConfig["auth"]
  ) {
    const { request } = context;
    let authenticated = false;

    // Try API key authentication first
    if (authConfig?.allowApiKey !== false) {
      const apiKeyValue =
        request.headers.get("x-api-key") ||
        request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

      if (apiKeyValue) {
        const apiKey = await verifyApiKey(apiKeyValue);

        if (apiKey) {
          // Get client IP and origin
          const clientIp =
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            request.headers.get("x-real-ip") ||
            "unknown";

          const origin =
            request.headers.get("origin") ||
            request.headers.get("referer") ||
            undefined;

          // Check rate limit using Redis-based service
          // This handles: IP whitelist, Origin validation, Tier-based limits
          try {
            const rateLimit = await RateLimitService.checkLimit(apiKey, {
              ip: clientIp,
              origin,
            });

            context.rateLimit = {
              limit: rateLimit.limit,
              remaining: rateLimit.remaining,
              reset: rateLimit.reset,
            };

            logger.debug("Rate limit check passed", {
              keyId: apiKey.id,
              tier: rateLimit.tier,
              remaining: rateLimit.remaining,
            });
          } catch (error) {
            if (error instanceof RateLimitError) {
              const retryAfter = error.result.retryAfter || 0;

              logger.warn("Rate limit exceeded", {
                keyId: apiKey.id,
                tier: error.result.tier,
                retryAfter,
              });

              throw new ApiError(
                error.message,
                ErrorCode.RATE_LIMITED,
                429,
                {
                  retryAfter,
                  limit: error.result.limit,
                  reset: error.result.reset
                }
              );
            }
            throw error; // Re-throw other errors
          }

          // Set API key context
          context.apiKey = apiKey;
          authenticated = true;

          logger.debug("API key authenticated", {
            keyId: apiKey.id,
            userId: apiKey.userId,
            remaining: context.rateLimit?.remaining,
          });
        }
      }
    }

    // Try session authentication if API key not used
    if (!authenticated && authConfig?.allowSession !== false) {
      // Let Better Auth's bearer plugin/cookies handle it via headers
      const sessionData = await verifySessionFromHeaders(
        request.headers as any
      );

      if (sessionData) {
        context.user = sessionData.user;
        context.session = sessionData.session;
        authenticated = true;

        logger.debug("Session authenticated", {
          userId: sessionData.user.id,
          role: sessionData.user.role,
        });
      }
    }

    // Check if authentication is required
    if (authConfig?.required && !authenticated) {
      throw new ApiError(
        "Authentication required. Provide a valid API key or session.",
        ErrorCode.UNAUTHORIZED,
        401
      );
    }

    // Check permissions
    if (
      authenticated &&
      authConfig?.requiredPermissions &&
      authConfig.requiredPermissions.length > 0
    ) {
      const hasRequiredPermissions = hasPermission(
        context,
        authConfig.requiredPermissions
      );

      if (!hasRequiredPermissions) {
        logger.warn("Insufficient permissions", {
          userId: context.user?.id || context.apiKey?.userId,
          required: authConfig.requiredPermissions,
          userRole: context.user?.role,
          apiKeyScopes: context.apiKey?.scopes,
        });

        throw new ApiError(
          `Insufficient permissions. Required: ${authConfig.requiredPermissions.join(
            ", "
          )}`,
          ErrorCode.FORBIDDEN,
          403
        );
      }
    }
  }

  private static handleError(error: unknown): NextResponse {
    logger.error("API Error:", error);

    if (error instanceof ApiError) {
      const response = NextResponse.json(
        createErrorResponse(
          error.code as ErrorCode,
          error.message,
          error.statusCode,
          error.details
        ),
        { status: error.statusCode }
      );

      // Add Retry-After header for rate limit errors
      if (
        error.statusCode === 429 &&
        error.details &&
        typeof error.details === "object" &&
        "retryAfter" in error.details
      ) {
        response.headers.set("Retry-After", String(error.details.retryAfter));
      }

      return response;
    }

    if (error instanceof z.ZodError) {
      const message = error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.VALIDATION_ERROR,
          `Validation error: ${message}`,
          400
        ),
        { status: 400 }
      );
    }

    // Generic server error
    return NextResponse.json(
      createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        "Internal server error",
        500
      ),
      { status: 500 }
    );
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Common validation schemas
export const commonSchemas = {
  id: z.object({
    id: z.string().uuid("Invalid UUID format"),
  }),

  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),

  sort: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),

  search: z.object({
    query: z.string().optional(),
  }),

  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/i, "Invalid Ethereum address"),

  abi: z.array(z.record(z.string(), z.unknown())).min(1, "ABI cannot be empty"),
};

// Helper functions for common operations
export const withPagination = <T extends z.ZodObject<any>>(schema: T) =>
  schema.merge(commonSchemas.pagination);

export const withSort = <T extends z.ZodObject<any>>(schema: T) =>
  schema.merge(commonSchemas.sort);

export const withSearch = <T extends z.ZodObject<any>>(schema: T) =>
  schema.merge(commonSchemas.search);

export const withId = <T extends z.ZodObject<any>>(schema: T) =>
  schema.merge(commonSchemas.id);
