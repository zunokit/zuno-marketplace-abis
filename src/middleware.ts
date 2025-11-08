import { NextRequest, NextResponse } from "next/server";
import { validateApiVersion, getSupportedApiVersions } from "@/shared/lib/utils/api-version";
import { withRequestLogging } from "@/shared/lib/middleware/request-logging";
import { appConfig } from "@/shared/config/app.config";

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
      const response = NextResponse.json(
        {
          error: "Unsupported API version",
          message: `API version '${clientVersion}' is not supported. Supported versions: ${supportedVersions.join(", ")}`,
          supportedVersions,
        },
        { status: 400 }
      );

      // Add request ID to error response
      response.headers.set("X-Request-ID", requestId);
      return response;
    }

    // Create response with validated version
    const response = NextResponse.next();

    // Set internal header for use in route handlers
    response.headers.set("X-Internal-API-Version", validatedVersion);

    // Set public headers for client
    response.headers.set("X-API-Version", validatedVersion);
    response.headers.set("X-API-Deprecated", "false");

    // Request ID already set by withRequestLogging, but ensure it's there
    if (!response.headers.has("X-Request-ID")) {
      response.headers.set("X-Request-ID", requestId);
    }

    return response;
  }

  // For protected routes (/admin, /dashboard):
  // Let the layout server components handle authentication and redirects
  // This avoids duplicate checks and follows Next.js best practices

  const response = NextResponse.next();

  // Ensure request ID is set
  if (!response.headers.has("X-Request-ID")) {
    response.headers.set("X-Request-ID", requestId);
  }

  return response;
}

export const config = {
  matcher: [
    // Match API routes for version validation and logging
    "/api/:path*",
    // Match admin routes for logging (auth handled by layout)
    "/admin/:path*",
  ],
};
