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
import {
  RateLimitService,
  RateLimitError,
} from "@/infrastructure/services/rate-limit.service";
import { unwrapOrThrow } from "@/shared/lib/utils/try-catch-wrapper";
import { logger } from "@/shared/lib/utils/logger";
import {
  createFormattedErrorResponse,
  extractRequestId,
  logError,
  type FriendlyErrorResponse,
} from "./error-formatter";
import { getAuditLogRepository } from "@/infrastructure/di/container";
import { AuditLogService } from "@/core/services/audit-log/audit-log.service";

export interface ApiContext extends AuthContext {
  request: NextRequest;
  params?: Record<string, string>;
  requestId: string;
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
      const startTime = Date.now();
      let statusCode = 200;
      let responseError: Error | unknown = null;

      try {
        // 1. Extract request metadata
        const requestId = extractRequestId(request);

        // 2. Parse and validate request data
        const params = context?.params ? await context.params : {};
        const parsedData = await this.parseRequest(
          request,
          config.validation,
          params
        );

        // 3. Create API context
        const apiContext: ApiContext = {
          request,
          params,
          requestId,
        };

        // 4. Handle authentication if required
        if (config.auth?.required !== false) {
          await this.handleAuth(apiContext, config.auth);
        }

        // 5. Execute the handler
        const result = await handler(parsedData as TInput, apiContext);

        // 6. Return success response
        const response = NextResponse.json(createSuccessResponse(result), {
          status: 200,
        });

        // Add request tracking headers
        response.headers.set("X-Request-ID", requestId);

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

        // 7. Log successful request (async, non-blocking)
        this.logAuditTrail(request, apiContext, statusCode, startTime);

        return response;
      } catch (error) {
        responseError = error;
        statusCode = this.getStatusCodeFromError(error);

        // Log failed request (async, non-blocking)
        const requestId = extractRequestId(request);
        this.logAuditTrail(
          request,
          { request, requestId } as ApiContext,
          statusCode,
          startTime,
          error
        );

        return this.handleError(error, request);
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
        try {
          const text = await request.text();
          if (text.trim()) {
            body = JSON.parse(text);
          }
        } catch (error) {
          // If parsing fails, leave body as undefined
          logger.debug("Failed to parse request body as JSON", { error });
        }
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
            const rateLimitResult = await RateLimitService.checkLimit(apiKey, {
              ip: clientIp,
              origin,
            });

            const rateLimit = unwrapOrThrow(rateLimitResult);

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

              throw new ApiError(error.message, ErrorCode.RATE_LIMITED, 429, {
                retryAfter,
                limit: error.result.limit,
                reset: error.result.reset,
              });
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

  private static handleError(
    error: unknown,
    request: NextRequest
  ): NextResponse {
    // Convert all errors to ApiError for consistent handling
    let apiError: ApiError;

    if (error instanceof ApiError) {
      apiError = error;
    } else if (error instanceof z.ZodError) {
      // Convert Zod validation errors to ApiError
      apiError = new ApiError(
        "Validation failed. Please check your input.",
        ErrorCode.VALIDATION_ERROR,
        400,
        { issues: error.issues }
      );
    } else if (error instanceof Error) {
      // Check if error has custom code and statusCode properties (e.g., ContractError, AbiError)
      const customError = error as any;
      if (customError.code && customError.statusCode) {
        apiError = new ApiError(
          error.message,
          customError.code,
          customError.statusCode,
          customError.details
        );
      } else {
        // Generic error handling
        apiError = new ApiError(
          error.message || "Internal server error",
          ErrorCode.INTERNAL_ERROR,
          500
        );
      }
    } else {
      // Unknown error type
      apiError = new ApiError(
        "An unexpected error occurred",
        ErrorCode.INTERNAL_ERROR,
        500
      );
    }

    // Format error response with user-friendly messages
    const formattedError = createFormattedErrorResponse(apiError, request, {
      includeDebugInfo: process.env.NODE_ENV === "development",
      environment: process.env.NODE_ENV as "development" | "production",
    });

    // Create response
    const response = NextResponse.json(formattedError, {
      status: apiError.statusCode,
    });

    // Add request tracking header
    response.headers.set("X-Request-ID", formattedError.error.requestId);

    // Add Retry-After header for rate limit errors
    if (
      apiError.statusCode === 429 &&
      apiError.details &&
      typeof apiError.details === "object" &&
      "retryAfter" in apiError.details
    ) {
      response.headers.set("Retry-After", String(apiError.details.retryAfter));
    }

    return response;
  }

  /**
   * Log API request to audit trail (async, non-blocking)
   */
  private static logAuditTrail(
    request: NextRequest,
    context: ApiContext,
    statusCode: number,
    startTime: number,
    error?: Error | unknown
  ): void {
    try {
      const duration = Date.now() - startTime;
      const url = new URL(request.url);

      // Initialize audit service
      const auditRepository = getAuditLogRepository();
      const auditService = new AuditLogService(auditRepository);

      // Extract client info
      const ipAddress = this.extractClientIp(request);
      const userAgent = request.headers.get("user-agent");

      // Log the request
      auditService.logApiRequest({
        userId: context.user?.id || null,
        apiKeyId: context.apiKey?.id || null,
        method: request.method,
        path: url.pathname,
        ipAddress,
        userAgent,
        statusCode,
        duration,
        error,
      });
    } catch (auditError) {
      // Don't let audit logging errors crash the app
      logger.error("Failed to log audit trail", { error: auditError });
    }
  }

  /**
   * Extract client IP from request headers
   */
  private static extractClientIp(request: NextRequest): string | null {
    // Check common headers in order of preference
    const headers = [
      "x-forwarded-for",
      "x-real-ip",
      "cf-connecting-ip", // Cloudflare
      "x-client-ip",
    ];

    for (const header of headers) {
      const value = request.headers.get(header);
      if (value) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return value.split(",")[0].trim();
      }
    }

    return null;
  }

  /**
   * Get HTTP status code from error
   */
  private static getStatusCodeFromError(error: unknown): number {
    if (error instanceof ApiError) {
      return error.statusCode;
    }
    if (error instanceof z.ZodError) {
      return 400;
    }
    if (error instanceof RateLimitError) {
      return 429;
    }
    return 500;
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
    // Support both UUID and custom ID format (e.g., abi_v1_xyz123)
    id: z.string().min(1, "ID is required"),
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

  // ABI can be either:
  // 1. Array of ABI items (direct JSON)
  // 2. String (JSON string that will be parsed)
  abi: z
    .union([
      z.array(z.record(z.string(), z.unknown())).min(1, "ABI cannot be empty"),
      z
        .string()
        .min(1, "ABI cannot be empty")
        .transform((str, ctx) => {
          try {
            const parsed = JSON.parse(str);
            if (!Array.isArray(parsed)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "ABI must be an array",
              });
              return z.NEVER;
            }
            if (parsed.length === 0) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "ABI cannot be empty",
              });
              return z.NEVER;
            }
            return parsed;
          } catch (error) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Invalid ABI JSON format",
            });
            return z.NEVER;
          }
        }),
    ])
    .describe("Contract ABI (array of ABI items or JSON string)"),
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
