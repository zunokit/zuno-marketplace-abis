/**
 * API Utilities Barrel Export
 *
 * Centralized exports for API handling utilities.
 * Provides clean imports throughout the application.
 *
 * @module API
 */

// Core API handler
export {
  ApiWrapper,
  ApiError,
  type ApiContext,
  type ApiHandler,
  type ApiRouteConfig,
  commonSchemas,
  withPagination,
  withSort,
  withSearch,
  withId,
} from "./api-handler";

// Error formatting utilities
export {
  formatErrorResponse,
  createFormattedErrorResponse,
  extractRequestId,
  generateRequestId,
  logError,
  type FriendlyErrorResponse,
  type ErrorFormatterConfig,
} from "./error-formatter";

// Error message definitions
export {
  ERROR_MESSAGES,
  getErrorMessage,
  type ErrorMessageDefinition,
} from "./error-messages";
