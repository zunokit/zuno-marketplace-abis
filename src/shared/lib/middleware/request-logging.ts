/**
 * Request/Response Logging Middleware
 *
 * Comprehensive logging system for HTTP requests and responses.
 *
 * Features:
 * - Structured logging with consistent format
 * - Sensitive data masking (passwords, tokens, API keys)
 * - Performance tracking (request duration)
 * - Request/response metadata capture
 * - Error tracking and correlation
 * - Configurable log levels per environment
 * - Request ID tracking for distributed tracing
 *
 * @module RequestLoggingMiddleware
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { logger } from "@/shared/lib/utils/logger";
import { appConfig } from "@/shared/config/app.config";

// ============================================
// Types
// ============================================

export interface RequestLogData {
  requestId: string;
  method: string;
  url: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  ip?: string;
  userAgent?: string;
  referer?: string;
  body?: unknown;
  timestamp: string;
}

export interface ResponseLogData {
  requestId: string;
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body?: unknown;
  duration: number; // milliseconds
  timestamp: string;
}

export interface RequestResponseLog {
  request: RequestLogData;
  response: ResponseLogData;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ============================================
// Sensitive Data Patterns
// ============================================

/**
 * Patterns for sensitive data that should be masked in logs
 */
const SENSITIVE_HEADERS = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "api-key",
  "x-auth-token",
  "x-csrf-token",
];

const SENSITIVE_QUERY_PARAMS = ["token", "api_key", "apiKey", "password", "secret"];

const SENSITIVE_BODY_FIELDS = [
  "password",
  "newPassword",
  "oldPassword",
  "confirmPassword",
  "apiKey",
  "secret",
  "token",
  "privateKey",
  "secretKey",
  "accessToken",
  "refreshToken",
];

// ============================================
// Data Masking Utilities
// ============================================

/**
 * Mask a sensitive value
 */
function maskValue(value: string): string {
  if (!value || value.length === 0) return "[REDACTED]";
  if (value.length <= 8) return "[REDACTED]";

  // Show first 4 and last 4 characters for debugging
  const start = value.substring(0, 4);
  const end = value.substring(value.length - 4);
  return `${start}...${end}`;
}

/**
 * Mask sensitive headers
 */
function maskHeaders(headers: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.some((sensitive) => lowerKey.includes(sensitive))) {
      masked[key] = maskValue(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Mask sensitive query parameters
 */
function maskQueryParams(query: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};

  for (const [key, value] of Object.entries(query)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_QUERY_PARAMS.some((sensitive) => lowerKey.includes(sensitive))) {
      masked[key] = maskValue(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Mask sensitive fields in request/response body
 */
function maskBody(body: unknown): unknown {
  if (!body || typeof body !== "object") {
    return body;
  }

  if (Array.isArray(body)) {
    return body.map((item) => maskBody(item));
  }

  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_BODY_FIELDS.some((sensitive) => lowerKey.includes(sensitive))) {
      masked[key] = typeof value === "string" ? maskValue(value) : "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      masked[key] = maskBody(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

// ============================================
// Request ID Management
// ============================================

/**
 * Get or generate request ID
 */
function getRequestId(request: NextRequest): string {
  // Check for existing request ID from upstream proxy/load balancer
  const existingId =
    request.headers.get("x-request-id") ||
    request.headers.get("x-correlation-id") ||
    request.headers.get("x-trace-id");

  if (existingId) {
    return existingId;
  }

  // Generate new request ID
  return `req_${nanoid(16)}`;
}

// ============================================
// Extract Request Data
// ============================================

/**
 * Extract and sanitize request data for logging
 */
async function extractRequestData(
  request: NextRequest,
  requestId: string
): Promise<RequestLogData> {
  // Extract URL and query parameters
  const url = request.url;
  const { pathname, searchParams } = request.nextUrl;
  const query: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    query[key] = value;
  });

  // Extract headers
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Extract client info
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const userAgent = request.headers.get("user-agent") || "unknown";
  const referer = request.headers.get("referer") || undefined;

  // Extract body (only for POST, PUT, PATCH)
  let body: unknown = undefined;
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    try {
      // Clone request to avoid consuming the original body
      const clonedRequest = request.clone();
      const contentType = request.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        body = await clonedRequest.json();
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await clonedRequest.formData();
        body = Object.fromEntries(formData.entries());
      } else if (contentType.includes("text/")) {
        body = await clonedRequest.text();
      }
      // Skip binary data (images, files, etc.)
    } catch (error) {
      // Body parsing failed - skip logging body
      body = "[UNPARSEABLE]";
    }
  }

  return {
    requestId,
    method: request.method,
    url,
    path: pathname,
    query: maskQueryParams(query),
    headers: maskHeaders(headers),
    ip,
    userAgent,
    referer,
    body: body ? maskBody(body) : undefined,
    timestamp: new Date().toISOString(),
  };
}

// ============================================
// Extract Response Data
// ============================================

/**
 * Extract and sanitize response data for logging
 */
async function extractResponseData(
  response: NextResponse,
  requestId: string,
  duration: number
): Promise<ResponseLogData> {
  // Extract headers
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Extract body (if JSON and small enough)
  let body: unknown = undefined;
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      // Clone response to avoid consuming the original body
      const clonedResponse = response.clone();
      const json = await clonedResponse.json();

      // Only log small responses (< 10KB)
      const jsonStr = JSON.stringify(json);
      if (jsonStr.length < 10000) {
        body = maskBody(json);
      } else {
        body = "[RESPONSE_TOO_LARGE]";
      }
    } catch (error) {
      // Body parsing failed - skip logging body
      body = "[UNPARSEABLE]";
    }
  }

  return {
    requestId,
    statusCode: response.status,
    statusText: response.statusText,
    headers: maskHeaders(headers),
    body,
    duration,
    timestamp: new Date().toISOString(),
  };
}

// ============================================
// Logging Functions
// ============================================

/**
 * Log request
 */
function logRequest(data: RequestLogData): void {
  const shouldLogBody = appConfig.logging.includeRequestBody;
  const logData = {
    requestId: data.requestId,
    method: data.method,
    path: data.path,
    ip: data.ip,
    userAgent: data.userAgent,
    ...(shouldLogBody && data.body ? { body: data.body } : {}),
  };

  logger.info(`→ ${data.method} ${data.path}`, logData as any);
}

/**
 * Log response
 */
function logResponse(data: ResponseLogData): void {
  const shouldLogBody = appConfig.logging.includeResponseBody;
  const logData = {
    requestId: data.requestId,
    statusCode: data.statusCode,
    duration: `${data.duration}ms`,
    ...(shouldLogBody && data.body ? { body: data.body } : {}),
  };

  // Use appropriate log level based on status code
  if (data.statusCode >= 500) {
    logger.error(`← ${data.statusCode} (${data.duration}ms)`, undefined, logData as any);
  } else if (data.statusCode >= 400) {
    logger.warn(`← ${data.statusCode} (${data.duration}ms)`, logData as any);
  } else {
    logger.info(`← ${data.statusCode} (${data.duration}ms)`, logData as any);
  }
}

/**
 * Log complete request/response cycle
 */
export function logRequestResponse(data: RequestResponseLog): void {
  logger.info("Request/Response Cycle", {
    requestId: data.request.requestId,
    method: data.request.method,
    path: data.request.path,
    statusCode: data.response.statusCode,
    duration: `${data.response.duration}ms`,
    ...(data.error && { error: data.error }),
  } as any);
}

// ============================================
// Middleware
// ============================================

/**
 * Request/Response logging middleware
 *
 * Wraps Next.js middleware to log all requests and responses.
 * Should be called at the start of middleware.ts.
 *
 * @param request - Next.js request
 * @param handler - Next middleware handler
 * @returns Response with logging applied
 *
 * @example
 * ```typescript
 * export async function middleware(request: NextRequest) {
 *   return withRequestLogging(request, async (req, requestId) => {
 *     // Your middleware logic here
 *     return NextResponse.next();
 *   });
 * }
 * ```
 */
export async function withRequestLogging(
  request: NextRequest,
  handler: (request: NextRequest, requestId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  // Skip logging for health checks and static assets if configured
  if (shouldSkipLogging(request)) {
    return handler(request, "skipped");
  }

  const startTime = Date.now();
  const requestId = getRequestId(request);

  let response: NextResponse;
  let error: Error | undefined;

  try {
    // Extract and log request data
    const requestData = await extractRequestData(request, requestId);
    logRequest(requestData);

    // Call the handler
    response = await handler(request, requestId);

    // Extract and log response data
    const duration = Date.now() - startTime;
    const responseData = await extractResponseData(response, requestId, duration);
    logResponse(responseData);

    // Add request ID to response headers for tracing
    response.headers.set("X-Request-ID", requestId);
    response.headers.set("X-Response-Time", `${duration}ms`);

    return response;
  } catch (err) {
    // Log error
    error = err instanceof Error ? err : new Error(String(err));
    const duration = Date.now() - startTime;

    logger.error("Request failed", error, {
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      duration: `${duration}ms`,
    } as any);

    // Re-throw to let Next.js handle it
    throw err;
  }
}

/**
 * Check if request should skip logging
 */
function shouldSkipLogging(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;

  // Skip health checks
  if (pathname === "/api/health" && !appConfig.logging.logHealthChecks) {
    return true;
  }

  // Skip static assets
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf)$/)
  ) {
    return true;
  }

  return false;
}
