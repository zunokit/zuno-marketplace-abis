/**
 * CORS Middleware
 *
 * Handles Cross-Origin Resource Sharing (CORS) for API routes.
 * Provides configurable CORS policies for development and production.
 *
 * Features:
 * - Configurable allowed origins
 * - Wildcard and regex pattern matching
 * - Preflight request handling
 * - Credentials support
 * - Method and header whitelisting
 * - Production-safe defaults
 *
 * @module CORSMiddleware
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/shared/config/env";
import { appConfig } from "@/shared/config/app.config";
import { getCurrentUrl } from "@/shared/lib/utils/url";

/**
 * CORS Configuration
 */
export interface CORSConfig {
  /**
   * Allowed origins (exact match, wildcard, or regex)
   * Examples:
   * - "https://example.com"
   * - "*.example.com"
   * - /^https:\/\/(.*\.)?example\.com$/
   */
  allowedOrigins: (string | RegExp)[];

  /**
   * Allowed HTTP methods
   */
  allowedMethods: string[];

  /**
   * Allowed request headers
   */
  allowedHeaders: string[];

  /**
   * Exposed response headers (visible to client)
   */
  exposedHeaders: string[];

  /**
   * Allow credentials (cookies, authorization headers)
   */
  allowCredentials: boolean;

  /**
   * Max age for preflight cache (seconds)
   */
  maxAge: number;

  /**
   * Allow all origins in development
   */
  allowAllOriginsDev: boolean;
}

/**
 * Default CORS configuration
 */
const defaultCORSConfig: CORSConfig = {
  allowedOrigins: [getCurrentUrl()],
  allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-API-Key",
    "X-API-Version",
    "Accept-Version",
    "X-Request-ID",
  ],
  exposedHeaders: [
    "X-Request-ID",
    "X-Response-Time",
    "X-API-Version",
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
  ],
  allowCredentials: true,
  maxAge: 86400, // 24 hours
  allowAllOriginsDev: true,
};

/**
 * Parse allowed origins from environment variable
 *
 * Supports comma-separated list with wildcards and regex patterns
 */
function parseAllowedOrigins(): (string | RegExp)[] {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;

  if (!envOrigins) {
    return defaultCORSConfig.allowedOrigins;
  }

  const origins: (string | RegExp)[] = [];

  for (const origin of envOrigins.split(",")) {
    const trimmed = origin.trim();

    // Regex pattern (starts and ends with /)
    if (trimmed.startsWith("/") && trimmed.endsWith("/")) {
      try {
        const pattern = trimmed.slice(1, -1);
        origins.push(new RegExp(pattern));
      } catch (error) {
        console.error(`Invalid CORS regex pattern: ${trimmed}`, error);
      }
    }
    // Exact match or wildcard
    else {
      origins.push(trimmed);
    }
  }

  return origins.length > 0 ? origins : defaultCORSConfig.allowedOrigins;
}

/**
 * Get CORS configuration
 *
 * Merges environment-specific configuration with defaults
 */
export function getCORSConfig(): CORSConfig {
  return {
    ...defaultCORSConfig,
    allowedOrigins: parseAllowedOrigins(),
  };
}

/**
 * Check if origin is allowed
 *
 * Supports exact match, wildcard patterns, and regex
 */
export function isOriginAllowed(
  origin: string | null,
  config: CORSConfig
): boolean {
  if (!origin) return false;

  // Allow all origins in development
  if (env.NODE_ENV === "development" && config.allowAllOriginsDev) {
    return true;
  }

  for (const allowed of config.allowedOrigins) {
    // Regex pattern
    if (allowed instanceof RegExp) {
      if (allowed.test(origin)) {
        return true;
      }
    }
    // Wildcard pattern (*.example.com)
    else if (allowed.includes("*")) {
      const pattern = allowed.replace(/\*/g, ".*").replace(/\./g, "\\.");
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(origin)) {
        return true;
      }
    }
    // Exact match
    else if (allowed === origin) {
      return true;
    }
  }

  return false;
}

/**
 * Add CORS headers to response
 *
 * Adds appropriate CORS headers based on request origin and configuration
 */
export function addCORSHeaders(
  request: NextRequest,
  response: NextResponse,
  config: CORSConfig = getCORSConfig()
): void {
  const origin = request.headers.get("origin");

  // Check if origin is allowed
  if (origin && isOriginAllowed(origin, config)) {
    // Allow the specific origin
    response.headers.set("Access-Control-Allow-Origin", origin);

    // Allow credentials
    if (config.allowCredentials) {
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
  }
  // In development, allow all origins if configured
  else if (
    env.NODE_ENV === "development" &&
    config.allowAllOriginsDev &&
    origin
  ) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  // Expose headers
  if (config.exposedHeaders.length > 0) {
    response.headers.set(
      "Access-Control-Expose-Headers",
      config.exposedHeaders.join(", ")
    );
  }

  // Vary header to prevent caching issues
  response.headers.set("Vary", "Origin");
}

/**
 * Handle preflight OPTIONS request
 *
 * Returns appropriate response for CORS preflight
 */
export function handlePreflightRequest(
  request: NextRequest,
  config: CORSConfig = getCORSConfig()
): NextResponse | null {
  // Only handle OPTIONS requests
  if (request.method !== "OPTIONS") {
    return null;
  }

  const origin = request.headers.get("origin");
  const requestMethod = request.headers.get("access-control-request-method");
  const requestHeaders = request.headers.get("access-control-request-headers");

  // Check if origin is allowed
  if (!origin || !isOriginAllowed(origin, config)) {
    // If not development, reject preflight
    if (!(env.NODE_ENV === "development" && config.allowAllOriginsDev)) {
      return new NextResponse(null, { status: 403 });
    }
  }

  // Create preflight response
  const response = new NextResponse(null, { status: 204 });

  // Set CORS headers
  if (origin && isOriginAllowed(origin, config)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else if (env.NODE_ENV === "development" && config.allowAllOriginsDev && origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  // Allow methods
  response.headers.set(
    "Access-Control-Allow-Methods",
    config.allowedMethods.join(", ")
  );

  // Allow headers
  if (requestHeaders) {
    // Use requested headers if they're within allowed set
    const requested = requestHeaders.split(",").map((h) => h.trim());
    const allowed = requested.filter((h) =>
      config.allowedHeaders.some(
        (allowed) => allowed.toLowerCase() === h.toLowerCase()
      )
    );

    if (allowed.length > 0) {
      response.headers.set("Access-Control-Allow-Headers", allowed.join(", "));
    } else {
      response.headers.set(
        "Access-Control-Allow-Headers",
        config.allowedHeaders.join(", ")
      );
    }
  } else {
    response.headers.set(
      "Access-Control-Allow-Headers",
      config.allowedHeaders.join(", ")
    );
  }

  // Allow credentials
  if (config.allowCredentials) {
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  // Max age
  response.headers.set("Access-Control-Max-Age", String(config.maxAge));

  // Vary header
  response.headers.set("Vary", "Origin");

  return response;
}

/**
 * CORS middleware wrapper
 *
 * Convenience function to apply CORS to middleware
 *
 * @param request - NextRequest
 * @param handler - Middleware handler function
 * @param config - CORS configuration
 * @returns Response with CORS headers
 *
 * @example
 * ```typescript
 * export async function middleware(request: NextRequest) {
 *   return withCORS(request, async (req) => {
 *     // Your middleware logic
 *     return NextResponse.next();
 *   });
 * }
 * ```
 */
export async function withCORS(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse,
  config: CORSConfig = getCORSConfig()
): Promise<NextResponse> {
  // Handle preflight request
  const preflightResponse = handlePreflightRequest(request, config);
  if (preflightResponse) {
    return preflightResponse;
  }

  // Execute handler
  const response = await handler(request);

  // Add CORS headers
  addCORSHeaders(request, response, config);

  return response;
}
