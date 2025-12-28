"use client";

import * as Sentry from "@sentry/nextjs";

// SENTRY_CLIENT_INIT_FILE - This file is required for Turbopack support
// See: https://github.com/getsentry/sentry-javascript/issues/8105
//
// This file replaces `sentry.client.config.ts` for Turbopack-based projects
// It initializes Sentry on the client side (browser)

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",

  // Set release from git SHA (Vercel provides this)
  release:
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_APP_VERSION ||
    "local",

  // Tracing - disabled for local development
  tracesSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,

  // Session replay
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  // Debug mode for development
  debug: process.env.NODE_ENV === "development",

  // Integrations
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter sensitive data
  beforeSend(event, hint) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["x-api-key"];
      delete event.request.headers["cookie"];
    }

    // Skip operational errors (not bugs)
    const skipErrors = [
      "RATE_LIMIT_EXCEEDED",
      "VALIDATION_ERROR",
      "UNAUTHORIZED",
      "NOT_FOUND",
      "FORBIDDEN",
      "BAD_REQUEST",
    ];

    const errorMessage = event.exception?.values?.[0]?.value || "";
    if (skipErrors.some((pattern) => errorMessage.includes(pattern))) {
      return null;
    }

    return event;
  },

  // Ignore browser extension errors
  ignoreErrors: ["top.GLOBALS", /.*\b(cordova|sencha)\b.*/],
  denyUrls: [/extensions\//i, /^chrome:\/\//i],
});

console.log("[instrumentation-client.ts] Sentry initialized");
