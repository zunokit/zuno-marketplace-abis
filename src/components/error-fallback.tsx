"use client";

/**
 * Reusable Error Fallback Components
 *
 * Pre-built error UI components for common error scenarios.
 * Use these with ErrorBoundary for consistent error handling.
 */

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  Bug,
  ServerCrash,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// ============================================
// Generic Error Fallback
// ============================================

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  title?: string;
  description?: string;
}

export function ErrorFallback({
  error,
  resetError,
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
}: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>

        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="mt-2 text-sm">
              {error.message}
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter>
          <Button onClick={resetError} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ============================================
// Inline Error Fallback (for smaller components)
// ============================================

export interface InlineErrorFallbackProps {
  error: Error;
  resetError: () => void;
  compact?: boolean;
}

export function InlineErrorFallback({
  error,
  resetError,
  compact = false,
}: InlineErrorFallbackProps) {
  if (compact) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-destructive">
              Error: {error.message}
            </p>
            <Button
              onClick={resetError}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">{error.message}</p>
        <Button onClick={resetError} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-3 w-3" />
          Try Again
        </Button>
      </AlertDescription>
    </Alert>
  );
}

// ============================================
// Data Fetching Error Fallback
// ============================================

export interface DataErrorFallbackProps {
  error: Error;
  resetError: () => void;
  resourceName?: string;
}

export function DataErrorFallback({
  error,
  resetError,
  resourceName = "data",
}: DataErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-destructive/10 p-3">
        <ServerCrash className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">
        Failed to load {resourceName}
      </h3>
      <p className="mb-4 text-sm text-muted-foreground max-w-md">
        {error.message || `Unable to fetch ${resourceName}. Please try again.`}
      </p>
      <Button onClick={resetError}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

// ============================================
// Component Error Fallback
// ============================================

export interface ComponentErrorFallbackProps {
  error: Error;
  resetError: () => void;
  componentName?: string;
}

export function ComponentErrorFallback({
  error,
  resetError,
  componentName,
}: ComponentErrorFallbackProps) {
  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-destructive/10 p-2">
          <Bug className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <p className="font-medium text-sm">
              {componentName
                ? `Error in ${componentName}`
                : "Component Error"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {error.message}
            </p>
          </div>
          <Button onClick={resetError} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-3 w-3" />
            Reload Component
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Network Error Fallback
// ============================================

export interface NetworkErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function NetworkErrorFallback({
  error,
  resetError,
}: NetworkErrorFallbackProps) {
  const isNetworkError =
    error.message?.toLowerCase().includes("network") ||
    error.message?.toLowerCase().includes("fetch") ||
    error.message?.toLowerCase().includes("connection");

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-yellow-500/10 p-3">
        <AlertTriangle className="h-8 w-8 text-yellow-600" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">
        {isNetworkError ? "Connection Error" : "Request Failed"}
      </h3>
      <p className="mb-4 text-sm text-muted-foreground max-w-md">
        {isNetworkError
          ? "Unable to connect to the server. Please check your internet connection."
          : error.message}
      </p>
      <div className="flex gap-2">
        <Button onClick={resetError}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        {isNetworkError && (
          <Button onClick={() => window.location.reload()} variant="outline">
            Reload Page
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Feature Section Error Wrapper
// ============================================

export interface FeatureSectionErrorBoundaryProps {
  children: ReactNode;
  featureName: string;
  fallbackRoute?: string;
}

/**
 * Convenience wrapper for feature sections
 * Automatically applies ErrorBoundary with appropriate fallback
 */
import { ErrorBoundary } from "./error-boundary";

export function FeatureSectionErrorBoundary({
  children,
  featureName,
  fallbackRoute,
}: FeatureSectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={(error, resetError) => (
        <ComponentErrorFallback
          error={error}
          resetError={resetError}
          componentName={featureName}
        />
      )}
      fallbackRoute={fallbackRoute}
    >
      {children}
    </ErrorBoundary>
  );
}
