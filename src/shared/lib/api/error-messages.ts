/**
 * Error Messages Definition
 *
 * Centralized error message definitions with English support.
 * Following i18n best practices for easy maintenance and extension.
 *
 * @module ErrorMessages
 */

import { ErrorCode } from "@/shared/types";

/**
 * Error message structure for user-facing responses
 */
export interface ErrorMessageDefinition {
  /** Brief error title */
  message: string;
  /** Detailed user-friendly explanation */
  userMessage: string;
  /** Actionable suggestion for resolution */
  suggestion?: string;
  /** Related documentation path */
  documentationPath?: string;
}

/**
 * Complete error message catalog
 */
type ErrorMessageCatalog = {
  [code in ErrorCode]: ErrorMessageDefinition;
};

/**
 * Error message definitions
 *
 * Each error code has:
 * - message: Short description
 * - userMessage: User-friendly explanation
 * - suggestion: Actionable next steps
 * - documentationPath: Reference documentation
 */
export const ERROR_MESSAGES: ErrorMessageCatalog = {
  [ErrorCode.UNAUTHORIZED]: {
    message: "Authentication Required",
    userMessage: "You must be authenticated to access this resource. Please provide valid credentials or an API key.",
    suggestion: "Log in with your account or verify your API key is correct and not expired.",
    documentationPath: "/docs/authentication",
  },
  [ErrorCode.FORBIDDEN]: {
    message: "Access Denied",
    userMessage: "You don't have permission to perform this action. This resource requires elevated privileges.",
    suggestion: "Contact your administrator to request the necessary permissions, or use an account with admin access.",
    documentationPath: "/docs/permissions",
  },
  [ErrorCode.NOT_FOUND]: {
    message: "Resource Not Found",
    userMessage: "The requested resource could not be found. It may have been deleted or the identifier is incorrect.",
    suggestion: "Verify the resource ID, address, or name. Check that you're using the correct network ID if applicable.",
    documentationPath: "/docs/resources",
  },
  [ErrorCode.VALIDATION_ERROR]: {
    message: "Invalid Input",
    userMessage: "The data you provided is invalid or incomplete. Please check your input and try again.",
    suggestion: "Review the error details below for specific field validation failures.",
    documentationPath: "/docs/api-reference",
  },
  [ErrorCode.RATE_LIMITED]: {
    message: "Rate Limit Exceeded",
    userMessage: "You've sent too many requests in a short time. Please slow down and try again later.",
    suggestion: "Wait before sending more requests, or consider upgrading to a higher tier for increased limits.",
    documentationPath: "/docs/rate-limits",
  },
  [ErrorCode.INTERNAL_ERROR]: {
    message: "Internal Server Error",
    userMessage: "An unexpected error occurred on our servers. Our team has been notified and is investigating.",
    suggestion: "Try again in a few moments. If the problem persists, contact support with your request ID.",
    documentationPath: "/docs/support",
  },
  [ErrorCode.ABI_INVALID]: {
    message: "Invalid ABI",
    userMessage: "The ABI you provided is not valid or is malformed.",
    suggestion: "Verify the ABI JSON structure is correct and contains valid function/event definitions.",
    documentationPath: "/docs/abis",
  },
  [ErrorCode.ABI_DUPLICATE]: {
    message: "Duplicate ABI",
    userMessage: "An ABI with this identifier already exists in the system.",
    suggestion: "Use a different identifier or update the existing ABI instead.",
    documentationPath: "/docs/abis",
  },
  [ErrorCode.ABI_NOT_FOUND]: {
    message: "ABI Not Found",
    userMessage: "The requested ABI could not be found in the system.",
    suggestion: "Verify the ABI ID is correct and that the ABI exists.",
    documentationPath: "/docs/abis",
  },
  [ErrorCode.ABI_VERSION_EXISTS]: {
    message: "ABI Version Already Exists",
    userMessage: "This version of the ABI already exists in the system.",
    suggestion: "Use a different version number or update the existing version.",
    documentationPath: "/docs/abis",
  },
  [ErrorCode.CONTRACT_NOT_FOUND]: {
    message: "Contract Not Found",
    userMessage: "The requested contract could not be found on this network.",
    suggestion: "Verify the contract address and network ID are correct.",
    documentationPath: "/docs/contracts",
  },
  [ErrorCode.CONTRACT_DUPLICATE]: {
    message: "Duplicate Contract",
    userMessage: "A contract with this address already exists on this network.",
    suggestion: "Use a different address or update the existing contract.",
    documentationPath: "/docs/contracts",
  },
  [ErrorCode.INVALID_ADDRESS]: {
    message: "Invalid Address",
    userMessage: "The provided contract address is not valid.",
    suggestion: "Ensure the address is a valid Ethereum-format address (0x followed by 40 hex characters).",
    documentationPath: "/docs/contracts",
  },
  [ErrorCode.NETWORK_NOT_FOUND]: {
    message: "Network Not Found",
    userMessage: "The requested network could not be found.",
    suggestion: "Verify the network ID or chain ID is correct.",
    documentationPath: "/docs/networks",
  },
  [ErrorCode.INVALID_CHAIN_ID]: {
    message: "Invalid Chain ID",
    userMessage: "The provided chain ID is not valid.",
    suggestion: "Ensure the chain ID is a positive integer.",
    documentationPath: "/docs/networks",
  },
  [ErrorCode.STORAGE_ERROR]: {
    message: "Storage Error",
    userMessage: "An error occurred while storing or retrieving data.",
    suggestion: "Try again in a few moments. If the problem persists, contact support.",
    documentationPath: "/docs/support",
  },
  [ErrorCode.IPFS_ERROR]: {
    message: "IPFS Error",
    userMessage: "An error occurred while interacting with IPFS.",
    suggestion: "Try again in a few moments. If the problem persists, contact support.",
    documentationPath: "/docs/support",
  },
  [ErrorCode.CACHE_ERROR]: {
    message: "Cache Error",
    userMessage: "An error occurred while accessing the cache.",
    suggestion: "Try again in a few moments. The request may still succeed without cache.",
    documentationPath: "/docs/support",
  },
};

/**
 * Get error message definition for a specific error code
 *
 * Falls back to NOT_FOUND message for unmapped error codes ending with "_NOT_FOUND"
 *
 * @param code - Error code
 * @returns Error message definition or undefined if code not found
 */
export function getErrorMessage(
  code: ErrorCode
): ErrorMessageDefinition | undefined {
  // Return specific message if available
  if (ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  // Fallback to NOT_FOUND for domain-specific "not found" errors
  if (code.includes("_NOT_FOUND")) {
    return ERROR_MESSAGES[ErrorCode.NOT_FOUND];
  }

  // Return undefined for completely unknown codes (will use error.message as fallback)
  return undefined;
}
