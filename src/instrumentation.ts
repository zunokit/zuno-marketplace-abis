/**
 * Application Instrumentation
 *
 * This file is automatically loaded by Next.js before the application starts.
 * It's the perfect place to initialize monitoring, error handling, and other
 * application-wide services.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { logger } from "./shared/lib/utils/logger";

/**
 * Register instrumentation
 *
 * Called once when the server starts (both dev and production)
 */
export async function register() {
  // Only run on server side (Node.js runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    logger.info("Initializing server instrumentation...");

    // Dynamically import Node.js-specific modules to avoid Edge Runtime compatibility issues
    const { initProcessErrorHandler } = await import(
      "./shared/lib/errors/process-error-handler"
    );

    // Initialize process-level error handlers
    initProcessErrorHandler({
      exitOnUncaughtException: process.env.NODE_ENV === "production",
      exitOnUnhandledRejection: false,
      gracePeriodMs: 5000,
      onError: (error, type) => {
        logger.error(`Process error caught: ${type}`, error, {
          errorType: type,
          environment: process.env.NODE_ENV,
        });
      },
    });

    logger.info("Server instrumentation complete", {
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV,
    });
  }
}

/**
 * Called on each request in Edge Runtime
 * Currently not used, but available for Edge-specific instrumentation
 */
export async function onRequestError(
  error: Error,
  request: Request,
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware";
  }
) {
  logger.error("Request error", error, {
    url: request.url,
    method: request.method,
    ...context,
  });

  // Send to monitoring service if configured
  if (process.env.SENTRY_DSN) {
    // Example Sentry integration:
    // import * as Sentry from "@sentry/nextjs";
    // Sentry.captureException(error, {
    //   contexts: {
    //     request: {
    //       url: request.url,
    //       method: request.method,
    //     },
    //     router: context,
    //   },
    // });
  }
}
