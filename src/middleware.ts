import { NextRequest, NextResponse } from "next/server";
import { validateApiVersion, getSupportedApiVersions } from "@/shared/lib/utils/api-version";
import { withCORS } from "@/shared/lib/middleware/cors";

/**
 * Next.js Middleware
 *
 * Handles:
 * - CORS for API routes
 * - API version validation
 *
 * Protected routes (/admin, /dashboard) are handled by layout server components
 */
export async function middleware(request: NextRequest) {
  // Apply CORS to all matched routes
  return withCORS(request, async (req) => {
    return middlewareHandler(req);
  });
}

/**
 * Main middleware handler logic
 */
async function middlewareHandler(request: NextRequest) {
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
      return NextResponse.json(
        {
          error: "Unsupported API version",
          message: `API version '${clientVersion}' is not supported. Supported versions: ${supportedVersions.join(", ")}`,
          supportedVersions,
        },
        { status: 400 }
      );
    }

    // Create response with validated version
    const response = NextResponse.next();

    // Set internal header for use in route handlers
    response.headers.set("X-Internal-API-Version", validatedVersion);

    // Set public headers for client
    response.headers.set("X-API-Version", validatedVersion);
    response.headers.set("X-API-Deprecated", "false");

    return response;
  }

  // For protected routes (/admin, /dashboard):
  // Let the layout server components handle authentication and redirects
  // This avoids duplicate checks and follows Next.js best practices

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match API routes for version validation and CORS
    "/api/:path*",
    // Match docs route for CORS
    "/docs",
  ],
};
