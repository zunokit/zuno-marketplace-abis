"use client";

/**
 * Global Error Page (Next.js 15 App Router)
 *
 * Catches errors in the root layout.tsx file.
 * This is a special fallback for when the root layout itself fails.
 *
 * IMPORTANT: This file MUST include its own <html> and <body> tags
 * because it replaces the root layout when an error occurs.
 *
 * Reference: https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in case logger is also broken
    console.error("Global error boundary caught an error:", {
      name: error.name,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html>
      <head>
        <title>Application Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
        }}
      >
        <div
          style={{
            maxWidth: "500px",
            padding: "2rem",
            backgroundColor: "white",
            borderRadius: "0.5rem",
            boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "#ef4444" }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                margin: 0,
              }}
            >
              Application Error
            </h1>
          </div>

          <p
            style={{
              color: "#6b7280",
              marginBottom: "1.5rem",
            }}
          >
            A critical error occurred in the application. Please refresh the
            page or contact support if the problem persists.
          </p>

          <div
            style={{
              padding: "1rem",
              backgroundColor: "#f9fafb",
              borderRadius: "0.375rem",
              marginBottom: "1.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.875rem",
                fontWeight: "500",
                margin: "0 0 0.5rem 0",
              }}
            >
              Error Details:
            </p>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#6b7280",
                margin: 0,
                wordBreak: "break-word",
              }}
            >
              {error.message || "An unknown error occurred"}
            </p>
            {error.digest && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#9ca3af",
                  marginTop: "0.5rem",
                  margin: 0,
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={reset}
              style={{
                flex: 1,
                padding: "0.5rem 1rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                flex: 1,
                padding: "0.5rem 1rem",
                backgroundColor: "white",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
