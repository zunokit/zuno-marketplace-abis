"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { logger } from "@/shared/lib/utils/logger";

/**
 * Root Error Boundary
 *
 * Catches errors in the root layout and pages.
 * Provides a user-friendly error display with recovery options.
 *
 * Features:
 * - Automatic error logging
 * - Retry functionality
 * - Navigation to home
 * - Development error details
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console and monitoring service
    logger.error("Root error boundary caught error", error, {
      digest: error.digest,
      name: error.name,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Oops! Something went wrong
          </h1>
          <p className="text-muted-foreground">
            We encountered an unexpected error. Please try again or contact support
            if the problem persists.
          </p>
        </div>

        {error.digest && (
          <p className="text-sm text-muted-foreground font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex gap-3 justify-center flex-wrap">
          <Button onClick={reset} variant="default">
            Try Again
          </Button>
          <Button onClick={() => (window.location.href = "/")} variant="outline">
            Go Home
          </Button>
        </div>

        {process.env.NODE_ENV === "development" && (
          <details className="mt-6 text-left rounded-lg border border-border bg-card p-4">
            <summary className="cursor-pointer font-semibold text-sm mb-2">
              Error Details (Development Only)
            </summary>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-mono text-destructive">
                  {error.name}: {error.message}
                </p>
              </div>
              {error.stack && (
                <pre className="text-xs font-mono overflow-auto max-h-64 text-muted-foreground">
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
