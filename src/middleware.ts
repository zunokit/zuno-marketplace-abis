import { NextRequest, NextResponse } from "next/server";
import { validateApiVersion, getSupportedApiVersions } from "@/shared/lib/utils/api-version";
import { addSecurityHeaders } from "@/shared/lib/middleware/security-headers";

/**
 * Next.js Middleware
 *
 * Handles:
 * - Security headers
 * - API version validation
 *
 * Protected routes (/admin, /dashboard) are handled by layout server components
 */
export async function middleware(request: NextRequest) {
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

    // Add security headers
    addSecurityHeaders(response);

    return response;
  }

  // For other routes, add security headers
  const response = NextResponse.next();
  addSecurityHeaders(response);

  return response;
}

export const config = {
  matcher: [
    // Match API routes for version validation and security headers
    "/api/:path*",
    // Match docs route for security headers
    "/docs",
    // Match admin routes for security headers
    "/admin/:path*",
  ],
};
