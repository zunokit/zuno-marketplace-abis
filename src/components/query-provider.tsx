"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ErrorBoundary } from "./error-boundary";
import { logger } from "@/shared/lib/utils/logger";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            // Global error handling for queries
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors (client errors)
              if (error instanceof Error && 'status' in error) {
                const status = (error as any).status;
                if (status >= 400 && status < 500) {
                  return false;
                }
              }
              // Retry up to 3 times for other errors
              return failureCount < 3;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            // Global error handling for mutations
            retry: false, // Don't retry mutations by default
            onError: (error) => {
              // Log mutation errors
              logger.error("Mutation error", {
                error: error instanceof Error ? error.message : String(error),
              } as any);
            },
          },
        },
      })
  );

  return (
    <ErrorBoundary
      errorTitle="Application Error"
      fallbackRoute="/"
      onError={(error, errorInfo) => {
        logger.error("Query Provider error boundary triggered", {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          componentStack: errorInfo.componentStack,
        } as any);
      }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ErrorBoundary>
  );
}
