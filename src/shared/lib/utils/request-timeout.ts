import { appConfig } from "@/shared/config/app.config";
import { logger } from "./logger";

/**
 * Timeout Error thrown when a request exceeds the allowed duration
 */
export class RequestTimeoutError extends Error {
  constructor(
    public timeoutMs: number,
    public operation?: string
  ) {
    super(
      operation
        ? `Operation '${operation}' timed out after ${timeoutMs}ms`
        : `Request timed out after ${timeoutMs}ms`
    );
    this.name = "RequestTimeoutError";
  }
}

/**
 * Execute a promise with a timeout
 *
 * @param promise - The promise to execute
 * @param timeoutMs - Timeout in milliseconds (defaults to app config timeout)
 * @param operation - Optional operation name for better error messages
 * @returns Promise that rejects if timeout is exceeded
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   fetch('/api/data'),
 *   5000,
 *   'Fetch API data'
 * );
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = appConfig.api.timeout,
  operation?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      logger.warn("Request timeout exceeded", {
        operation,
        timeoutMs,
      } as any);
      reject(new RequestTimeoutError(timeoutMs, operation));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Create an AbortController with automatic timeout
 *
 * @param timeoutMs - Timeout in milliseconds
 * @returns Object with signal and cleanup function
 *
 * @example
 * ```typescript
 * const { signal, cleanup } = createTimeoutSignal(5000);
 * try {
 *   const response = await fetch('/api/data', { signal });
 *   return await response.json();
 * } finally {
 *   cleanup();
 * }
 * ```
 */
export function createTimeoutSignal(
  timeoutMs: number = appConfig.api.timeout
): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new RequestTimeoutError(timeoutMs));
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
    },
  };
}

/**
 * Fetch wrapper with automatic timeout
 *
 * @param input - URL or Request object
 * @param init - Fetch options
 * @param timeoutMs - Timeout in milliseconds (defaults to app config)
 * @returns Fetch response
 *
 * @example
 * ```typescript
 * const response = await fetchWithTimeout('/api/data', {
 *   method: 'POST',
 *   body: JSON.stringify({ foo: 'bar' }),
 * }, 10000);
 * ```
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = appConfig.api.timeout
): Promise<Response> {
  const { signal, cleanup } = createTimeoutSignal(timeoutMs);

  try {
    // Merge signals if provided
    const combinedSignal = init?.signal
      ? AbortSignal.any([signal, init.signal])
      : signal;

    const response = await fetch(input, {
      ...init,
      signal: combinedSignal,
    });

    return response;
  } finally {
    cleanup();
  }
}

/**
 * Route segment config helper for Next.js API routes
 *
 * Export this from your API route to set max duration:
 *
 * @example
 * ```typescript
 * // app/api/route.ts
 * export const maxDuration = getMaxDuration(); // 30 seconds
 * export const dynamic = 'force-dynamic';
 * ```
 */
export function getMaxDuration(): number {
  // Convert milliseconds to seconds and round up
  return Math.ceil(appConfig.api.timeout / 1000);
}

/**
 * Retry helper with exponential backoff and timeout
 *
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Promise with result
 *
 * @example
 * ```typescript
 * const data = await retryWithTimeout(
 *   () => fetch('/api/data'),
 *   {
 *     retries: 3,
 *     timeout: 5000,
 *     backoffMs: 1000,
 *   }
 * );
 * ```
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    timeout?: number;
    backoffMs?: number;
    operation?: string;
  } = {}
): Promise<T> {
  const {
    retries = 3,
    timeout = appConfig.api.timeout,
    backoffMs = 1000,
    operation,
  } = options;

  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await withTimeout(fn(), timeout, operation);
      return result;
    } catch (error) {
      lastError = error;

      // Don't retry on timeout errors
      if (error instanceof RequestTimeoutError) {
        throw error;
      }

      // Don't retry if it's the last attempt
      if (attempt === retries) {
        break;
      }

      // Exponential backoff
      const delay = backoffMs * Math.pow(2, attempt);
      logger.warn("Retrying after error", {
        attempt: attempt + 1,
        maxRetries: retries,
        delay,
        error: error instanceof Error ? error.message : String(error),
      } as any);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
