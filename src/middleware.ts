import { NextRequest, NextResponse } from "next/server";
import { validateApiVersion, getSupportedApiVersions } from "@/shared/lib/utils/api-version";
import { withRequestLogging } from "@/shared/lib/middleware/request-logging";
import { addSecurityHeaders } from "@/shared/lib/middleware/security-headers";
import { appConfig } from "@/shared/config/app.config";

/**
 * Next.js Middleware
 *
 * Handles:
 * - Request/Response logging
 * - Security headers
 * - API version validation
 *
 * Protected routes (/admin, /dashboard) are handled by layout server components
 */
export async function middleware(request: NextRequest) {
  // Wrap with request/response logging if enabled
  if (appConfig.logging.enabled) {
    return withRequestLogging(request, async (req, requestId) => {
      return middlewareHandler(req, requestId);
    });
  }

  // Skip logging if disabled
  return middlewareHandler(request, "logging-disabled");
}

/**
 * Core middleware logic
 */
async function middlewareHandler(
  request: NextRequest,
  requestId: string
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // API Version detection and validation for all /api routes
  if (pathname.startsWith("/api")) {
    // Get version from client headers
    const clientVersion =
      request.headers.get("X-API-Version") ||
      request.headers.get("Accept-Version") ||
      "v1"; // Default to v1

    // Validate against database
    const isValid = await validateApiVersion(clientVersion);
    const validatedVersion = isValid ? clientVersion : "v1";

    // If invalid version provided, return error
    if (!isValid && (request.headers.get("X-API-Version") || request.headers.get("Accept-Version"))) {
      const supportedVersions = await getSupportedApiVersions();
      const errorResponse = NextResponse.json(
        {
          error: "Unsupported API version",
          message: `API version '${clientVersion}' is not supported. Supported versions: ${supportedVersions.join(", ")}`,
          supportedVersions,
        },
        { status: 400 }
      );

      // Add request ID to error response
      errorResponse.headers.set("X-Request-ID", requestId);

      // Add security headers to error response
      addSecurityHeaders(errorResponse);

      return errorResponse;
    }

    // Create response with validated version
    const response = NextResponse.next();

    // Set internal header for use in route handlers
    response.headers.set("X-Internal-API-Version", validatedVersion);

    // Set public headers for client
    response.headers.set("X-API-Version", validatedVersion);
    response.headers.set("X-API-Deprecated", "false");

    // Set timeout information for client
    response.headers.set("X-Request-Timeout", String(appConfig.api.timeout));
    response.headers.set("X-Request-Start", String(Date.now()));

    // Request ID already set by withRequestLogging, but ensure it's there
    if (!response.headers.has("X-Request-ID")) {
      response.headers.set("X-Request-ID", requestId);
    }

    // Add security headers
    addSecurityHeaders(response);

    return response;
  }

  // For other routes, add security headers and request ID
  const response = NextResponse.next();

  // Ensure request ID is set
  if (!response.headers.has("X-Request-ID")) {
    response.headers.set("X-Request-ID", requestId);
  }

  // Add security headers
  addSecurityHeaders(response);

  return response;
}

export const config = {
  matcher: [
    // Match API routes for version validation, logging, and security headers
    "/api/:path*",
    // Match docs route for security headers
    "/docs",
    // Match admin routes for security headers and logging (auth handled by layout)
    "/admin/:path*",
  ],
};
