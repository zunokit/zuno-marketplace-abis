/**
 * Error Response Formatter
 *
 * Transforms internal ApiError instances into user-friendly, standardized
 * error responses. Separates technical logging from user-facing messages.
 *
 * Features:
 * - Actionable suggestions
 * - Documentation links
 * - Request tracking
 * - Validation error details
 *
 * @module ErrorFormatter
 */

import { ApiError } from "./api-handler";
import { getErrorMessage } from "./error-messages";
import { ErrorCode } from "@/shared/types";
import { nanoid } from "nanoid";

/**
 * User-friendly error response structure
 *
 * This is what gets sent to the client, separate from technical logs
 */
export interface FriendlyErrorResponse {
  /** Always false for error responses */
  success: false;

  /** Error information object */
  error: {
    /** Machine-readable error code */
    code: ErrorCode;

    /** Brief error title */
    message: string;

    /** Detailed user-friendly explanation */
    userMessage: string;

    /** Actionable suggestion for resolution (optional) */
    suggestion?: string;

    /** Link to relevant documentation (optional) */
    documentationUrl?: string;

    /** ISO timestamp of when error occurred */
    timestamp: string;

    /** Unique request ID for tracking and support */
    requestId: string;

    /** Validation error details (for VALIDATION_ERROR) */
    validationErrors?: Array<{
      field: string;
      message: string;
      code?: string;
    }>;

    /** Additional context data (optional, for debugging) */
    details?: Record<string, any>;
  };
}

/**
 * Configuration for error formatting
 */
export interface ErrorFormatterConfig {
  /** Request ID (generated if not provided) */
  requestId?: string;

  /** Base URL for documentation links */
  baseUrl?: string;

  /** Include additional debug details (only in development) */
  includeDebugInfo?: boolean;

  /** Environment (production hides sensitive data) */
  environment?: "development" | "production";
}

/**
 * Format an ApiError into a user-friendly response
 *
 * This function:
 * 1. Extracts error information
 * 2. Looks up user-friendly messages
 * 3. Adds helpful suggestions
 * 4. Generates tracking information
 * 5. Excludes sensitive technical details in production
 *
 * @param error - The ApiError to format
 * @param config - Formatting configuration
 * @returns User-friendly error response
 *
 * @example
 * ```typescript
 * try {
 *   // Some operation
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     const response = formatErrorResponse(error, {
 *       requestId: req.headers.get('x-request-id')
 *     });
 *     return NextResponse.json(response, { status: error.statusCode });
 *   }
 * }
 * ```
 */
export function formatErrorResponse(
  error: ApiError,
  config: ErrorFormatterConfig = {}
): FriendlyErrorResponse {
  const {
    requestId = generateRequestId(),
    baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "",
    includeDebugInfo = false,
    environment = process.env.NODE_ENV as "development" | "production",
  } = config;

  // Get error message with fallback for unknown error codes
  const errorDef = getErrorMessage(error.code);

  // Build documentation URL if available
  const documentationUrl = errorDef?.documentationPath
    ? `${baseUrl}${errorDef.documentationPath}`
    : undefined;

  // Base error response
  const response: FriendlyErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: errorDef?.message || error.message,
      userMessage: errorDef?.userMessage || error.message,
      suggestion: errorDef?.suggestion,
      documentationUrl,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  // Add validation error details if present
  if (error.code === ErrorCode.VALIDATION_ERROR && error.details) {
    response.error.validationErrors = formatValidationErrors(error.details);
  }

  // Add debug details in development only
  if (includeDebugInfo && environment === "development" && error.details) {
    response.error.details = sanitizeErrorDetails(error.details);
  }

  return response;
}

/**
 * Format validation errors from Zod or other validators
 *
 * Converts technical validation errors into user-friendly messages
 *
 * @param details - Raw validation error details
 * @returns Formatted validation error array
 */
function formatValidationErrors(
  details: Record<string, any>
): Array<{ field: string; message: string; code?: string }> {
  const errors: Array<{ field: string; message: string; code?: string }> = [];

  // Handle Zod error format
  if (details.issues && Array.isArray(details.issues)) {
    for (const issue of details.issues) {
      errors.push({
        field: issue.path?.join(".") || "unknown",
        message: issue.message,
        code: issue.code,
      });
    }
  }
  // Handle generic error format
  else if (details.errors && typeof details.errors === "object") {
    for (const [field, message] of Object.entries(details.errors)) {
      errors.push({
        field,
        message: String(message),
      });
    }
  }
  // Fallback: convert to simple field errors
  else {
    for (const [field, value] of Object.entries(details)) {
      if (typeof value === "string") {
        errors.push({ field, message: value });
      }
    }
  }

  return errors;
}

/**
 * Sanitize error details for safe output
 *
 * Removes sensitive information from error details before sending to client
 *
 * @param details - Raw error details
 * @returns Sanitized details
 */
function sanitizeErrorDetails(
  details: Record<string, any>
): Record<string, any> {
  const sanitized: Record<string, any> = {};
  const sensitiveKeys = [
    "password",
    "apiKey",
    "token",
    "secret",
    "authorization",
    "cookie",
  ];

  for (const [key, value] of Object.entries(details)) {
    // Skip sensitive keys
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    // Recursively sanitize nested objects
    if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeErrorDetails(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Generate a unique request ID for tracking
 *
 * Uses nanoid for short, URL-safe IDs
 *
 * @returns Request ID with 'req_' prefix
 */
export function generateRequestId(): string {
  return `req_${nanoid(16)}`;
}

/**
 * Extract or generate request ID from headers
 *
 * @param request - Next.js Request object
 * @returns Request ID from header or newly generated
 */
export function extractRequestId(request: Request): string {
  return request.headers.get("x-request-id") || generateRequestId();
}

/**
 * Log error for monitoring and debugging
 *
 * Logs technical details server-side while keeping user-facing response clean
 *
 * @param error - The error to log
 * @param context - Additional context information
 */
export function logError(
  error: ApiError,
  context: {
    requestId: string;
    userId?: string;
    apiKeyId?: string;
    endpoint?: string;
    method?: string;
    [key: string]: any;
  }
): void {
  const logLevel = getLogLevel(error.statusCode);

  const logData = {
    level: logLevel,
    timestamp: new Date().toISOString(),
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack,
    },
    context,
  };

  // Use appropriate console method based on severity
  switch (logLevel) {
    case "ERROR":
      console.error(JSON.stringify(logData, null, 2));
      break;
    case "WARN":
      console.warn(JSON.stringify(logData, null, 2));
      break;
    default:
      console.log(JSON.stringify(logData, null, 2));
  }

  // In production, also send to monitoring service (Sentry, DataDog, etc.)
  if (process.env.NODE_ENV === "production") {
    // TODO: Integrate with monitoring service
    // Sentry.captureException(error, { contexts: { custom: context } });
  }
}

/**
 * Determine log level based on HTTP status code
 *
 * @param statusCode - HTTP status code
 * @returns Log level
 */
function getLogLevel(statusCode: number): "ERROR" | "WARN" | "INFO" {
  if (statusCode >= 500) return "ERROR";
  if (statusCode >= 400) return "WARN";
  return "INFO";
}

/**
 * Create a formatted error response with automatic request ID extraction
 *
 * Convenience function that combines request parsing and error formatting
 *
 * @param error - The ApiError to format
 * @param request - Next.js Request object
 * @param additionalConfig - Additional configuration
 * @returns Formatted error response
 *
 * @example
 * ```typescript
 * export async function GET(request: Request) {
 *   try {
 *     // ... route logic
 *   } catch (error) {
 *     if (error instanceof ApiError) {
 *       const response = createFormattedErrorResponse(error, request);
 *       return NextResponse.json(response, { status: error.statusCode });
 *     }
 *     throw error;
 *   }
 * }
 * ```
 */
export function createFormattedErrorResponse(
  error: ApiError,
  request: Request,
  additionalConfig: Partial<ErrorFormatterConfig> = {}
): FriendlyErrorResponse {
  const requestId = extractRequestId(request);

  // Log error with context
  logError(error, {
    requestId,
    endpoint: new URL(request.url).pathname,
    method: request.method,
  });

  return formatErrorResponse(error, {
    requestId,
    ...additionalConfig,
  });
}
