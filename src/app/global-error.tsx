"use client";

import { useEffect } from "react";
import { logger } from "@/shared/lib/utils/logger";

/**
 * Global Error Boundary
 *
 * Catches errors at the root level of the application.
 * This is the last line of defense for error handling.
 *
 * Features:
 * - Error logging to monitoring service
 * - User-friendly error display
 * - Error reporting capability
 * - Reset/retry functionality
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    logger.error("Global error boundary caught error", error, {
      digest: error.digest,
      name: error.name,
      stack: error.stack,
    });

    // Send to external monitoring (Sentry, DataDog, etc.)
    if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
      // Placeholder for error reporting
      // Example with Sentry:
      // import * as Sentry from "@sentry/nextjs";
      // Sentry.captureException(error);
      console.error("[Global Error]", error);
    }
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            backgroundColor: "#0a0a0a",
            color: "#ffffff",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "600px",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontSize: "3rem",
                fontWeight: "bold",
                marginBottom: "1rem",
                color: "#ef4444",
              }}
            >
              Something went wrong!
            </h1>

            <p
              style={{
                fontSize: "1.125rem",
                marginBottom: "2rem",
                color: "#a1a1aa",
                lineHeight: "1.75",
              }}
            >
              We apologize for the inconvenience. Our team has been notified and is
              working to resolve the issue.
            </p>

            {error.digest && (
              <p
                style={{
                  fontSize: "0.875rem",
                  marginBottom: "2rem",
                  color: "#71717a",
                  fontFamily: "monospace",
                }}
              >
                Error ID: {error.digest}
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={reset}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#6366f1",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#4f46e5")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#6366f1")
                }
              >
                Try Again
              </button>

              <a
                href="/"
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#27272a",
                  color: "white",
                  border: "1px solid #3f3f46",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  textDecoration: "none",
                  display: "inline-block",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#3f3f46")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#27272a")
                }
              >
                Go Home
              </a>
            </div>

            {process.env.NODE_ENV === "development" && (
              <details
                style={{
                  marginTop: "2rem",
                  textAlign: "left",
                  backgroundColor: "#18181b",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #27272a",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                  }}
                >
                  Error Details (Development Only)
                </summary>
                <pre
                  style={{
                    fontSize: "0.875rem",
                    color: "#ef4444",
                    overflow: "auto",
                    fontFamily: "monospace",
                  }}
                >
                  {error.name}: {error.message}
                  {"\n\n"}
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
