import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { validateApiVersion, getSupportedApiVersions } from "@/shared/lib/utils/api-version";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
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

  // Redirect authenticated users away from auth pages
  if (sessionCookie && ["/auth/signin", "/auth/signup"].includes(pathname)) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Redirect unauthenticated users trying to access admin to signin
  if (!sessionCookie && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // Redirect unauthenticated users to signin
  if (!sessionCookie && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // Admin routes require admin role - need to verify via API call
  if (sessionCookie && pathname.startsWith("/admin")) {
    try {
      const sessionResponse = await fetch(
        `${request.nextUrl.origin}/api/auth/get-session`,
        {
          headers: {
            cookie: request.headers.get("cookie") || "",
          },
        }
      );

      if (sessionResponse.ok) {
        const sessionData = (await sessionResponse.json()) as {
          user?: {
            role?: string;
          };
        };

        if (sessionData.user?.role !== "admin") {
          return NextResponse.redirect(new URL("/auth/signin", request.url));
        }
      }
    } catch {
      // If session check fails, redirect to signin
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
    // Match protected routes
    "/dashboard/:path*",
    "/admin/:path*",
    // Skip static files and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
