"use client";

/**
 * Admin Section Error Page (Next.js 15 App Router)
 *
 * Catches errors specifically within the admin section.
 * Provides admin-specific error handling and recovery options.
 */

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Home, RefreshCw, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { logger } from "@/shared/lib/utils/logger";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error with admin context
    logger.error("Admin section error boundary caught an error", {
      error: {
        name: error.name,
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      },
      context: "admin",
      timestamp: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.href : "unknown",
    } as any);
  }, [error]);

  // Check if error is authentication-related
  const isAuthError =
    error.message?.toLowerCase().includes("unauthorized") ||
    error.message?.toLowerCase().includes("forbidden") ||
    error.message?.toLowerCase().includes("authentication");

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>
              {isAuthError ? "Access Error" : "Admin Panel Error"}
            </CardTitle>
          </div>
          <CardDescription>
            {isAuthError
              ? "There was an authentication or authorization error."
              : "An error occurred in the admin panel. Please try again."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Main Error Alert */}
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{error.name || "Error"}</AlertTitle>
            <AlertDescription className="mt-2">
              {error.message || "An unexpected error occurred"}
            </AlertDescription>
          </Alert>

          {/* Auth Error Specific Guidance */}
          {isAuthError && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription className="mt-2">
                You may need to sign in again or your session may have expired.
                Please try signing in again.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Metadata */}
          {error.digest && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">
                Error ID: <code className="font-mono">{error.digest}</code>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Please include this ID when reporting the issue to support.
              </p>
            </div>
          )}

          {/* Development Error Details */}
          {process.env.NODE_ENV === "development" && error.stack && (
            <details className="rounded-lg bg-muted p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Stack Trace (Development Only)
              </summary>
              <pre className="mt-2 overflow-auto text-xs">
                {error.stack}
              </pre>
            </details>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2">
          {/* Try Again */}
          <Button onClick={reset} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>

          {/* Go to Admin Home */}
          <Button
            variant="secondary"
            onClick={() => (window.location.href = "/admin")}
          >
            <Home className="mr-2 h-4 w-4" />
            Admin Home
          </Button>

          {/* Sign In (for auth errors) */}
          {isAuthError && (
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/auth/signin")}
            >
              Sign In Again
            </Button>
          )}

          {/* Reload Page */}
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload Page
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
