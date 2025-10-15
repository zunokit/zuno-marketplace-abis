import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname;

  // API Version check for /api/v1 routes
  if (pathname.startsWith('/api/v1')) {
    const apiVersion =
      request.headers.get('X-API-Version') ||
      request.headers.get('Accept-Version');

    // If no version header is provided, default to v1
    if (!apiVersion) {
      const response = NextResponse.next();
      response.headers.set('X-API-Version', 'v1');
      response.headers.set('X-API-Deprecated', 'false');
      return response;
    }

    // Validate API version
    const supportedVersions = ['v1', '1.0', '1'];
    if (!supportedVersions.includes(apiVersion)) {
      return NextResponse.json(
        {
          error: 'Unsupported API version',
          message: `API version '${apiVersion}' is not supported. Supported versions: ${supportedVersions.join(
            ', '
          )}`,
          supportedVersions
        },
        { status: 400 }
      );
    }

    // Add version headers to response
    const response = NextResponse.next();
    response.headers.set('X-API-Version', 'v1');
    response.headers.set('X-API-Deprecated', 'false');
    return response;
  }

  // Protected routes (dashboard, admin)
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    try {
      const sessionResponse = await fetch(
        `${request.nextUrl.origin}/api/auth/get-session`,
        {
          headers: {
            cookie: request.headers.get('cookie') || ''
          }
        }
      );

      if (!sessionResponse.ok) {
        return NextResponse.redirect(new URL('/auth/signin', request.url));
      }

      const sessionData = (await sessionResponse.json()) as {
        user?: {
          id: string;
          email: string;
          role?: string;
        };
        session?: {
          id: string;
          userId: string;
        };
      };

      if (!sessionData.user || !sessionData.session) {
        return NextResponse.redirect(new URL('/auth/signin', request.url));
      }

      // Admin routes require admin role
      if (pathname.startsWith('/admin') && sessionData.user.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match protected routes
    '/dashboard/:path*',
    '/admin/:path*',
    // Skip static files and images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
