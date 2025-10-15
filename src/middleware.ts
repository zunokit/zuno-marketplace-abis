import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // API Version enforcement for all /api routes using headers
  if (pathname.startsWith("/api")) {
    const apiVersion =
      request.headers.get("X-API-Version") ||
      request.headers.get("Accept-Version");

    // If no version header is provided, default to v1
    if (!apiVersion) {
      const response = NextResponse.next();
      response.headers.set("X-API-Version", "v1");
      response.headers.set("X-API-Deprecated", "false");
      return response;
    }

    // Validate API version
    const supportedVersions = ["v1", "1.0", "1"];
    if (!supportedVersions.includes(apiVersion)) {
      return NextResponse.json(
        {
          error: "Unsupported API version",
          message: `API version '${apiVersion}' is not supported. Supported versions: ${supportedVersions.join(
            ", "
          )}`,
          supportedVersions,
        },
        { status: 400 }
      );
    }

    // Add version headers to response
    const response = NextResponse.next();
    response.headers.set("X-API-Version", "v1");
    response.headers.set("X-API-Deprecated", "false");
    return response;
  }

  // Redirect authenticated users away from auth pages
  if (sessionCookie && ["/auth/signin", "/auth/signup"].includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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
          return NextResponse.redirect(new URL("/dashboard", request.url));
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
