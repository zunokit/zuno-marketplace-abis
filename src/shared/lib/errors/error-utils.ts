/**
 * Error Utilities
 *
 * Type guards, error transformers, and utility functions for consistent
 * error handling across the application.
 *
 * @module ErrorUtils
 */

import { ApiError } from "../api/api-handler";
import { ErrorCode } from "@/shared/types";
import { ZodError } from "zod";
import { logger } from "../utils/logger";

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Type guard to check if an error is a Zod validation error
 */
export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

/**
 * Type guard to check if an error is a standard Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard to check if error is a network/fetch error
 */
export function isNetworkError(error: unknown): boolean {
  if (!isError(error)) return false;

  const networkErrorNames = [
    "NetworkError",
    "TypeError",
    "FetchError",
    "AbortError",
  ];

  return (
    networkErrorNames.includes(error.name) ||
    error.message.toLowerCase().includes("network") ||
    error.message.toLowerCase().includes("fetch")
  );
}

/**
 * Type guard to check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (!isError(error)) return false;

  return (
    error.name === "TimeoutError" ||
    error.message.toLowerCase().includes("timeout") ||
    error.message.toLowerCase().includes("timed out")
  );
}

/**
 * Transform any error into an ApiError
 *
 * Provides consistent error handling by converting various error types
 * into standardized ApiError instances.
 *
 * @param error - Any error object
 * @param fallbackCode - Error code to use if not determinable
 * @returns ApiError instance
 */
export function toApiError(
  error: unknown,
  fallbackCode: ErrorCode = ErrorCode.INTERNAL_ERROR
): ApiError {
  // Already an ApiError, return as-is
  if (isApiError(error)) {
    return error;
  }

  // Zod validation error
  if (isZodError(error)) {
    return new ApiError(
      "Validation failed",
      ErrorCode.VALIDATION_ERROR,
      400,
      {
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
      }
    );
  }

  // Network errors
  if (isNetworkError(error)) {
    return new ApiError(
      "Network request failed",
      ErrorCode.INTERNAL_ERROR,
      503,
      { originalError: isError(error) ? error.message : String(error) }
    );
  }

  // Timeout errors
  if (isTimeoutError(error)) {
    return new ApiError(
      "Request timeout",
      ErrorCode.INTERNAL_ERROR,
      504,
      { originalError: isError(error) ? error.message : String(error) }
    );
  }

  // Standard Error
  if (isError(error)) {
    return new ApiError(
      error.message || "An unexpected error occurred",
      fallbackCode,
      500,
      {
        name: error.name,
        stack: error.stack,
      }
    );
  }

  // Unknown error type
  return new ApiError(
    typeof error === "string" ? error : "An unknown error occurred",
    fallbackCode,
    500,
    { originalError: String(error) }
  );
}

/**
 * Safe error message extraction
 *
 * Extracts error message safely from any error type.
 * Falls back to generic message if extraction fails.
 *
 * @param error - Any error value
 * @param fallback - Fallback message
 * @returns Error message string
 */
export function getErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred"
): string {
  if (isApiError(error)) {
    return error.message;
  }

  if (isError(error)) {
    return error.message || fallback;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return fallback;
}

/**
 * Retry async operation with exponential backoff
 *
 * Attempts an operation multiple times with increasing delays between attempts.
 * Useful for handling transient errors like network failures.
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Result of the async function
 * @throws Last error if all retries fail
 *
 * @example
 * ```typescript
 * const data = await retryAsync(
 *   () => fetch('https://api.example.com/data'),
 *   { maxAttempts: 3, baseDelay: 1000 }
 * );
 * ```
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (error: Error, attempt: number) => void;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry = () => {},
    shouldRetry = (error) => isNetworkError(error) || isTimeoutError(error),
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = isError(error) ? error : new Error(String(error));

      // Don't retry if we've exhausted attempts
      if (attempt === maxAttempts) {
        break;
      }

      // Don't retry if shouldRetry returns false
      if (!shouldRetry(lastError)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

      logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, {
        error: lastError.message,
        attempt,
      });

      onRetry(lastError, attempt);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries failed
  throw lastError!;
}

/**
 * Wrap async function with error handling
 *
 * Automatically converts errors to ApiError and provides consistent
 * error handling for async operations.
 *
 * @param fn - Async function to wrap
 * @param errorCode - Error code to use for unexpected errors
 * @returns Wrapped function with error handling
 *
 * @example
 * ```typescript
 * const safeFetch = withErrorHandling(
 *   async () => fetch('https://api.example.com'),
 *   ErrorCode.EXTERNAL_SERVICE_ERROR
 * );
 * ```
 */
export function withErrorHandling<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  errorCode: ErrorCode = ErrorCode.INTERNAL_ERROR
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw toApiError(error, errorCode);
    }
  };
}

/**
 * Safe async operation wrapper
 *
 * Executes async operation and returns a result object instead of throwing.
 * Useful for operations where you want to handle errors explicitly.
 *
 * @param fn - Async function to execute
 * @returns Result object with success flag and data/error
 *
 * @example
 * ```typescript
 * const result = await safeAsync(() => fetchUserData(userId));
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function safeAsync<T>(
  fn: () => Promise<T>
): Promise<
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: Error }
> {
  try {
    const data = await fn();
    return { success: true, data, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: isError(error) ? error : new Error(String(error)),
    };
  }
}

/**
 * Aggregate multiple errors into a single error
 *
 * Useful for operations that perform multiple independent tasks
 * and need to report all failures.
 *
 * @param errors - Array of errors
 * @param code - Error code for aggregated error
 * @returns ApiError with all error details
 */
export function aggregateErrors(
  errors: unknown[],
  code: ErrorCode = ErrorCode.INTERNAL_ERROR
): ApiError {
  const errorMessages = errors.map((err) => getErrorMessage(err));

  return new ApiError(
    `Multiple errors occurred: ${errorMessages.join("; ")}`,
    code,
    500,
    {
      errors: errors.map((err) => ({
        message: getErrorMessage(err),
        details: isError(err) ? { name: err.name, stack: err.stack } : undefined,
      })),
      count: errors.length,
    }
  );
}

/**
 * Create domain-specific error
 *
 * Helper to create errors with custom context for specific domains
 * (e.g., database, IPFS, authentication).
 *
 * @param domain - Domain name (e.g., 'database', 'ipfs', 'auth')
 * @param operation - Operation that failed
 * @param error - Original error
 * @param code - Error code
 * @returns ApiError with domain context
 */
export function createDomainError(
  domain: string,
  operation: string,
  error: unknown,
  code: ErrorCode = ErrorCode.INTERNAL_ERROR
): ApiError {
  const message = `${domain} ${operation} failed: ${getErrorMessage(error)}`;

  return new ApiError(message, code, 500, {
    domain,
    operation,
    originalError: isError(error)
      ? { name: error.name, message: error.message, stack: error.stack }
      : String(error),
  });
}
