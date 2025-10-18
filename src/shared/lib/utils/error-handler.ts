import { ErrorCode, ApiError } from "@/shared/types";
import { logger } from "./logger";

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): ApiError {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(ErrorCode.NOT_FOUND, message, 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized access") {
    super(ErrorCode.UNAUTHORIZED, message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden: insufficient permissions") {
    super(ErrorCode.FORBIDDEN, message, 403);
    this.name = "ForbiddenError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Rate limit exceeded") {
    super(ErrorCode.RATE_LIMITED, message, 429);
    this.name = "RateLimitError";
  }
}

export class DuplicateError extends AppError {
  constructor(resource: string, field?: string) {
    const message = field
      ? `${resource} with this ${field} already exists`
      : `${resource} already exists`;
    super(ErrorCode.VALIDATION_ERROR, message, 409);
    this.name = "DuplicateError";
  }
}

export class StorageError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.STORAGE_ERROR, message, 500, details);
    this.name = "StorageError";
  }
}

export class CacheError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.CACHE_ERROR, message, 500, details);
    this.name = "CacheError";
  }
}

export class ErrorHandler {
  static handle(error: unknown): ApiError {
    // Log the error
    logger.error("Error occurred", error);

    // Handle known AppError instances
    if (error instanceof AppError) {
      return error.toJSON();
    }

    // Handle Zod validation errors
    if (error && typeof error === "object" && "issues" in error) {
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: "Validation failed",
        statusCode: 400,
        details: error,
      };
    }

    // Handle database errors
    if (error instanceof Error) {
      if (error.message.includes("unique constraint")) {
        return {
          code: ErrorCode.VALIDATION_ERROR,
          message: "Resource already exists",
          statusCode: 409,
        };
      }

      if (error.message.includes("foreign key constraint")) {
        return {
          code: ErrorCode.VALIDATION_ERROR,
          message: "Referenced resource not found",
          statusCode: 400,
        };
      }
    }

    // Default to internal server error
    return {
      code: ErrorCode.INTERNAL_ERROR,
      message: error instanceof Error ? error.message : "An unexpected error occurred",
      statusCode: 500,
    };
  }

  static isOperationalError(error: unknown): boolean {
    return error instanceof AppError;
  }

  static getStatusCode(error: unknown): number {
    if (error instanceof AppError) {
      return error.statusCode;
    }
    return 500;
  }
}
