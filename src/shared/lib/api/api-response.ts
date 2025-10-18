import { NextResponse } from "next/server";
import {
  ApiResponse,
  ErrorCode,
  createSuccessResponse,
  createErrorResponse,
} from "@/shared/types";
import { AppError, ErrorHandler } from "@/shared/lib/utils/error-handler";

export class ApiResponseBuilder {
  /**
   * Success response with data
   */
  static success<T>(
    data: T,
    status = 200,
    meta?: Record<string, unknown>
  ): NextResponse {
    const response = createSuccessResponse(data, meta);
    return NextResponse.json(response, { status });
  }

  /**
   * Created response (201)
   */
  static created<T>(data: T, meta?: Record<string, unknown>): NextResponse {
    return this.success(data, 201, meta);
  }

  /**
   * No content response (204)
   */
  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
  }

  /**
   * Error response
   */
  static error(
    code: ErrorCode,
    message: string,
    statusCode = 500,
    details?: unknown
  ): NextResponse {
    const response = createErrorResponse(code, message, statusCode, details);
    return NextResponse.json(response, { status: statusCode });
  }

  /**
   * Handle error and return appropriate response
   */
  static handleError(error: unknown): NextResponse {
    const apiError = ErrorHandler.handle(error);
    const response: ApiResponse = {
      success: false,
      error: apiError,
      meta: {
        timestamp: new Date().toISOString(),
        version: "v1",
      },
    };
    return NextResponse.json(response, { status: apiError.statusCode });
  }

  /**
   * Validation error response (400)
   */
  static validationError(message: string, details?: unknown): NextResponse {
    return this.error(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }

  /**
   * Not found error response (404)
   */
  static notFound(resource: string, identifier?: string): NextResponse {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    return this.error(ErrorCode.NOT_FOUND, message, 404);
  }

  /**
   * Unauthorized error response (401)
   */
  static unauthorized(message = "Unauthorized access"): NextResponse {
    return this.error(ErrorCode.UNAUTHORIZED, message, 401);
  }

  /**
   * Forbidden error response (403)
   */
  static forbidden(
    message = "Forbidden: insufficient permissions"
  ): NextResponse {
    return this.error(ErrorCode.FORBIDDEN, message, 403);
  }

  /**
   * Rate limit error response (429)
   */
  static rateLimited(
    message = "Rate limit exceeded",
    retryAfter?: number
  ): NextResponse {
    const headers: Record<string, string> = {};
    if (retryAfter) {
      headers["Retry-After"] = retryAfter.toString();
    }
    const response = this.error(ErrorCode.RATE_LIMITED, message, 429);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  /**
   * Internal server error response (500)
   */
  static internalError(
    message = "Internal server error",
    details?: unknown
  ): NextResponse {
    return this.error(ErrorCode.INTERNAL_ERROR, message, 500, details);
  }

  /**
   * Add pagination headers to response
   */
  static withPagination<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): NextResponse {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const response = this.success({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    });

    // Add Link header for pagination
    const links: string[] = [];
    const baseUrl = ""; // Should be constructed from request URL

    if (hasNext) {
      links.push(`<${baseUrl}?page=${page + 1}&limit=${limit}>; rel="next"`);
    }
    if (hasPrev) {
      links.push(`<${baseUrl}?page=${page - 1}&limit=${limit}>; rel="prev"`);
    }
    links.push(`<${baseUrl}?page=1&limit=${limit}>; rel="first"`);
    links.push(`<${baseUrl}?page=${totalPages}&limit=${limit}>; rel="last"`);

    if (links.length > 0) {
      response.headers.set("Link", links.join(", "));
    }

    // Add pagination info headers
    response.headers.set("X-Total-Count", total.toString());
    response.headers.set("X-Page", page.toString());
    response.headers.set("X-Per-Page", limit.toString());
    response.headers.set("X-Total-Pages", totalPages.toString());

    return response;
  }

  /**
   * Add cache headers to response
   */
  static withCache(response: NextResponse, maxAge: number): NextResponse {
    response.headers.set(
      "Cache-Control",
      `public, max-age=${maxAge}, s-maxage=${maxAge}`
    );
    return response;
  }

  /**
   * Add rate limit headers to response
   */
  static withRateLimit(
    response: NextResponse,
    limit: number,
    remaining: number,
    reset: number
  ): NextResponse {
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", reset.toString());
    return response;
  }

  /**
   * Add API version header
   */
  static withVersion(response: NextResponse, version: string): NextResponse {
    response.headers.set("X-API-Version", version);
    return response;
  }

  /**
   * Add CORS headers
   */
  static withCORS(response: NextResponse, origin?: string): NextResponse {
    response.headers.set("Access-Control-Allow-Origin", origin || "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-API-Key, X-API-Version"
    );
    response.headers.set("Access-Control-Max-Age", "86400");
    return response;
  }
}
