/**
 * Process-Level Error Handler
 *
 * Handles uncaught exceptions and unhandled promise rejections
 * at the Node.js process level. This is the last line of defense
 * for server-side errors.
 *
 * Features:
 * - Uncaught exception handling
 * - Unhandled rejection handling
 * - Graceful shutdown
 * - Error logging and reporting
 * - Process exit prevention (configurable)
 *
 * @module ProcessErrorHandler
 */

import { logger } from "../utils/logger";
import { getErrorMessage, isError } from "./error-utils";
import * as Sentry from "@sentry/node";

/**
 * Configuration for process error handler
 */
export interface ProcessErrorHandlerConfig {
  /**
   * Whether to exit process on uncaught exception
   * Default: true in production, false in development
   */
  exitOnUncaughtException?: boolean;

  /**
   * Whether to exit process on unhandled rejection
   * Default: false (log and continue)
   */
  exitOnUnhandledRejection?: boolean;

  /**
   * Callback for custom error handling (e.g., send to monitoring service)
   */
  onError?: (error: Error, type: "uncaughtException" | "unhandledRejection") => void;

  /**
   * Grace period before exit (milliseconds)
   * Allows cleanup operations to complete
   */
  gracePeriodMs?: number;
}

/**
 * Process Error Handler Class
 */
export class ProcessErrorHandler {
  private static instance: ProcessErrorHandler | null = null;
  private config: Required<ProcessErrorHandlerConfig>;
  private isShuttingDown = false;

  private constructor(config: ProcessErrorHandlerConfig = {}) {
    this.config = {
      exitOnUncaughtException:
        config.exitOnUncaughtException ?? process.env.NODE_ENV === "production",
      exitOnUnhandledRejection: config.exitOnUnhandledRejection ?? false,
      onError: config.onError ?? (() => {}),
      gracePeriodMs: config.gracePeriodMs ?? 5000,
    };
  }

  /**
   * Initialize process error handler (singleton)
   */
  public static init(config?: ProcessErrorHandlerConfig): ProcessErrorHandler {
    if (!ProcessErrorHandler.instance) {
      ProcessErrorHandler.instance = new ProcessErrorHandler(config);
      ProcessErrorHandler.instance.registerHandlers();
    }
    return ProcessErrorHandler.instance;
  }

  /**
   * Get current instance
   */
  public static getInstance(): ProcessErrorHandler | null {
    return ProcessErrorHandler.instance;
  }

  /**
   * Register Node.js process error handlers
   */
  private registerHandlers(): void {
    // Handle uncaught exceptions
    process.on("uncaughtException", (error: Error) => {
      this.handleUncaughtException(error);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason: unknown, promise: Promise<any>) => {
      this.handleUnhandledRejection(reason, promise);
    });

    // Handle process warnings
    process.on("warning", (warning: Error) => {
      this.handleWarning(warning);
    });

    // Graceful shutdown on SIGTERM
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, starting graceful shutdown");
      this.gracefulShutdown();
    });

    // Graceful shutdown on SIGINT (Ctrl+C)
    process.on("SIGINT", () => {
      logger.info("SIGINT received, starting graceful shutdown");
      this.gracefulShutdown();
    });

    logger.info("Process error handlers registered", {
      exitOnUncaughtException: this.config.exitOnUncaughtException,
      exitOnUnhandledRejection: this.config.exitOnUnhandledRejection,
    });
  }

  /**
   * Handle uncaught exception
   */
  private handleUncaughtException(error: Error): void {
    logger.error("UNCAUGHT EXCEPTION - Application may be in unstable state", error, {
      type: "uncaughtException",
      name: error.name,
      stack: error.stack,
    });

    // Call custom error handler
    try {
      this.config.onError(error, "uncaughtException");
    } catch (handlerError) {
      logger.error("Error in custom error handler", handlerError);
    }

    // Send to monitoring service
    this.sendToMonitoring(error, "uncaughtException");

    // Exit if configured
    if (this.config.exitOnUncaughtException) {
      logger.error(
        "Exiting process due to uncaught exception (EXIT_CODE: 1)",
        undefined,
        { gracePeriodMs: this.config.gracePeriodMs }
      );

      // Give time for logs to flush and cleanup to occur
      setTimeout(() => {
        process.exit(1);
      }, this.config.gracePeriodMs);
    }
  }

  /**
   * Handle unhandled promise rejection
   */
  private handleUnhandledRejection(reason: unknown, promise: Promise<any>): void {
    const error = isError(reason) ? reason : new Error(String(reason));

    logger.error("UNHANDLED PROMISE REJECTION", error, {
      type: "unhandledRejection",
      reason: getErrorMessage(reason),
      promise: String(promise),
    });

    // Call custom error handler
    try {
      this.config.onError(error, "unhandledRejection");
    } catch (handlerError) {
      logger.error("Error in custom error handler", handlerError);
    }

    // Send to monitoring service
    this.sendToMonitoring(error, "unhandledRejection");

    // Exit if configured
    if (this.config.exitOnUnhandledRejection) {
      logger.error(
        "Exiting process due to unhandled rejection (EXIT_CODE: 1)",
        undefined,
        { gracePeriodMs: this.config.gracePeriodMs }
      );

      setTimeout(() => {
        process.exit(1);
      }, this.config.gracePeriodMs);
    }
  }

  /**
   * Handle process warnings
   */
  private handleWarning(warning: Error): void {
    logger.warn("Process warning", {
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
    });
  }

  /**
   * Perform graceful shutdown
   */
  private gracefulShutdown(): void {
    if (this.isShuttingDown) {
      logger.warn("Shutdown already in progress");
      return;
    }

    this.isShuttingDown = true;

    logger.info("Starting graceful shutdown...");

    // Cleanup tasks
    const cleanup = async () => {
      try {
        // Add cleanup tasks here:
        // - Close database connections
        // - Stop accepting new requests
        // - Finish processing current requests
        // - Close Redis connections
        // - etc.

        logger.info("Cleanup completed");
      } catch (error) {
        logger.error("Error during cleanup", error);
      }
    };

    cleanup()
      .then(() => {
        logger.info("Graceful shutdown completed");
        process.exit(0);
      })
      .catch((error) => {
        logger.error("Graceful shutdown failed", error);
        process.exit(1);
      });

    // Force exit if grace period exceeded
    setTimeout(() => {
      logger.error("Graceful shutdown timeout exceeded, forcing exit");
      process.exit(1);
    }, this.config.gracePeriodMs);
  }

  /**
   * Send error to monitoring service
   */
  private sendToMonitoring(
    error: Error,
    type: "uncaughtException" | "unhandledRejection"
  ): void {
    try {
      // Only send to Sentry if enabled and in production (non-blocking)
      if (
        process.env.SENTRY_DSN &&
        process.env.NODE_ENV === "production"
      ) {
        Promise.resolve().then(() =>
          Sentry.captureException(error, {
            level: "fatal",
            tags: {
              type,
              processError: "true",
            },
            extra: {
              processUptime: process.uptime(),
              memoryUsage: process.memoryUsage(),
            },
          })
        ).catch((e) => logger.debug("Failed to send fatal error to Sentry", { error: e }));

        logger.info("Fatal error sent to Sentry", { type, message: error.message });
      }

      // Always log locally
      logger.error("Process error", error, { type });
    } catch (monitoringError) {
      logger.error("Failed to send error to monitoring service", monitoringError);
    }
  }

  /**
   * Manually trigger error handler (for testing)
   */
  public testUncaughtException(): void {
    throw new Error("Test uncaught exception");
  }

  /**
   * Manually trigger unhandled rejection (for testing)
   */
  public testUnhandledRejection(): void {
    Promise.reject(new Error("Test unhandled rejection"));
  }
}

/**
 * Initialize process error handler
 *
 * Call this once at application startup (e.g., in instrumentation.ts or server entry point)
 *
 * @param config - Configuration options
 * @returns ProcessErrorHandler instance
 *
 * @example
 * ```typescript
 * // In instrumentation.ts or server.ts
 * import { initProcessErrorHandler } from "@/shared/lib/errors/process-error-handler";
 *
 * initProcessErrorHandler({
 *   exitOnUncaughtException: true,
 *   exitOnUnhandledRejection: false,
 *   gracePeriodMs: 5000,
 *   onError: (error, type) => {
 *     // Custom error handling
 *     console.error(`Process error (${type}):`, error);
 *   },
 * });
 * ```
 */
export function initProcessErrorHandler(
  config?: ProcessErrorHandlerConfig
): ProcessErrorHandler {
  return ProcessErrorHandler.init(config);
}
