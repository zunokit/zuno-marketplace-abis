import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSuccessResponse, createErrorResponse, ErrorCode } from "@/shared/types";

export interface ApiContext {
  request: NextRequest;
  params?: Record<string, string>;
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  apiKey?: {
    id: string;
    userId: string;
    permissions: string[];
    metadata?: Record<string, unknown>;
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
    return async (request: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
      try {
        // 1. Parse and validate request data
        const params = context?.params ? await context.params : {};
        const parsedData = await this.parseRequest(request, config.validation, params);

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
        return NextResponse.json(createSuccessResponse(result), { status: 200 });

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
    if (!authConfig?.required) return;

    const { request } = context;

    // Try API key authentication first
    if (authConfig.allowApiKey !== false) {
      const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");

      if (apiKey) {
        // TODO: Implement API key validation
        // For now, we'll skip API key validation
        return;
      }
    }

    // Try session authentication
    if (authConfig.allowSession !== false) {
      // TODO: Implement session validation with Better Auth
      // For now, we'll skip session validation
      return;
    }

    // If authentication is required but not provided
    if (authConfig.required) {
      throw new ApiError("Authentication required", ErrorCode.UNAUTHORIZED, 401);
    }
  }

  private static handleError(error: unknown): NextResponse {
    console.error("API Error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json(
        createErrorResponse(error.code as ErrorCode, error.message, error.statusCode),
        { status: error.statusCode }
      );
    }

    if (error instanceof z.ZodError) {
      const message = error.issues.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
      return NextResponse.json(
        createErrorResponse(ErrorCode.VALIDATION_ERROR, `Validation error: ${message}`, 400),
        { status: 400 }
      );
    }

    // Generic server error
    return NextResponse.json(
      createErrorResponse(ErrorCode.INTERNAL_ERROR, "Internal server error", 500),
      { status: 500 }
    );
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode: number = 500
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

  abi: z.array(z.record(z.unknown())).min(1, "ABI cannot be empty"),
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