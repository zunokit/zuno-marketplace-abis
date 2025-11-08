"use client";

/**
 * React Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * Features:
 * - Class-based error boundary (React 19 compatible)
 * - Automatic error logging with stack traces
 * - User-friendly error UI with recovery options
 * - Type-safe error handling
 * - Development vs production error messages
 * - Reset functionality to recover from errors
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */

import React, { Component, ReactNode, ErrorInfo } from "react";
import { logger } from "@/shared/lib/utils/logger";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// ============================================
// Types
// ============================================

export interface ErrorBoundaryProps {
  /** Child components to protect */
  children: ReactNode;

  /** Custom fallback UI (optional) */
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);

  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;

  /** Custom error title */
  errorTitle?: string;

  /** Whether to show detailed error in development */
  showDetailedError?: boolean;

  /** Fallback route to redirect on error */
  fallbackRoute?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ============================================
// Error Boundary Component
// ============================================

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error details and call custom error handler
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error with full context
    logger.error("React Error Boundary caught an error", {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    } as any);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset error state (for recovery)
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Navigate to fallback route
   */
  navigateToFallback = (): void => {
    if (this.props.fallbackRoute) {
      window.location.href = this.props.fallbackRoute;
    }
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const {
      children,
      fallback,
      errorTitle = "Something went wrong",
      showDetailedError = process.env.NODE_ENV === "development",
      fallbackRoute,
    } = this.props;

    // If error occurred, show fallback UI
    if (hasError && error) {
      // Custom fallback
      if (fallback) {
        if (typeof fallback === "function") {
          return fallback(error, this.resetError);
        }
        return fallback;
      }

      // Default fallback UI
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <CardTitle>{errorTitle}</CardTitle>
              </div>
              <CardDescription>
                An unexpected error occurred. Please try refreshing the page or
                contact support if the problem persists.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error Summary */}
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{error.name || "Error"}</AlertTitle>
                <AlertDescription className="mt-2">
                  {error.message}
                </AlertDescription>
              </Alert>

              {/* Detailed Error (Development Only) */}
              {showDetailedError && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Technical Details (Development Mode):
                  </p>

                  {/* Error Stack */}
                  {error.stack && (
                    <pre className="overflow-auto rounded-md bg-muted p-4 text-xs">
                      {error.stack}
                    </pre>
                  )}

                  {/* Component Stack */}
                  {errorInfo?.componentStack && (
                    <details className="rounded-md bg-muted p-4">
                      <summary className="cursor-pointer text-xs font-medium">
                        Component Stack
                      </summary>
                      <pre className="mt-2 overflow-auto text-xs">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-wrap gap-2">
              {/* Retry Button */}
              <Button onClick={this.resetError} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>

              {/* Fallback Route Button */}
              {fallbackRoute && (
                <Button
                  onClick={this.navigateToFallback}
                  variant="secondary"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to {fallbackRoute === "/" ? "Home" : "Safety"}
                </Button>
              )}

              {/* Reload Page Button */}
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    // No error, render children normally
    return children;
  }
}

// ============================================
// Utility Hook for Functional Components
// ============================================

/**
 * Hook to manually trigger error boundary
 * Useful for async errors that aren't caught by React's error boundary
 *
 * @example
 * ```tsx
 * const handleError = useErrorHandler();
 *
 * try {
 *   await fetchData();
 * } catch (error) {
 *   handleError(error);
 * }
 * ```
 */
export function useErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error | null>(null);

  return React.useCallback((error: Error) => {
    // This will trigger the nearest error boundary
    setError(() => {
      throw error;
    });
  }, []);
}
