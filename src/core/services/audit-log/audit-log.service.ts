/**
 * Audit Log Service
 *
 * Business logic for audit logging with async processing.
 * This service handles:
 * - Non-blocking audit log creation
 * - Action name inference from HTTP method + path
 * - Resource type detection
 * - Error metadata extraction
 *
 * @architecture Clean Architecture - Application Service Layer
 */

import type { AuditLogRepository } from "@/core/domain/audit-log/audit-log.repository";
import type { CreateAuditLogInput } from "@/core/domain/audit-log/audit-log.entity";
import { logger } from "@/shared/lib/utils/logger";

export interface LogApiRequestInput {
  // Authentication context
  userId?: string | null;
  apiKeyId?: string | null;

  // Request details
  method: string;
  path: string;

  // Client information
  ipAddress?: string | null;
  userAgent?: string | null;

  // Response details
  statusCode: number;
  duration?: number | null; // milliseconds

  // Error details
  error?: Error | unknown;

  // Request data (sanitized)
  requestBody?: Record<string, unknown>;

  // Resource context
  resourceType?: string | null;
  resourceId?: string | null;
}

export class AuditLogService {
  constructor(private readonly repository: AuditLogRepository) {}

  /**
   * Log API request asynchronously (non-blocking)
   * This is the main entry point for logging from ApiWrapper
   */
  async logApiRequest(input: LogApiRequestInput): Promise<void> {
    try {
      // Infer action name from method + path
      const action = this.inferAction(input.method, input.path);

      // Auto-detect resource type from path if not provided
      const resourceType = input.resourceType || this.detectResourceType(input.path);

      // Prepare metadata
      const metadata = this.buildMetadata(input);

      // Create audit log entry
      const auditInput: CreateAuditLogInput = {
        userId: input.userId || null,
        apiKeyId: input.apiKeyId || null,
        method: input.method,
        path: input.path,
        action,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        resourceType,
        resourceId: input.resourceId || null,
        statusCode: input.statusCode,
        duration: input.duration || null,
        metadata,
      };

      // Execute async (fire-and-forget with error handling)
      this.repository.create(auditInput).catch((error) => {
        // Don't let audit logging errors crash the app
        logger.error("Failed to create audit log", { error, input: auditInput });
      });
    } catch (error) {
      // Catch synchronous errors
      logger.error("Audit log service error", { error, input });
    }
  }

  /**
   * Infer human-readable action from HTTP method and path
   * Examples:
   * - POST /api/abis → CREATE_ABI
   * - PUT /api/contracts/123 → UPDATE_CONTRACT
   * - DELETE /api/networks/1 → DELETE_NETWORK
   */
  private inferAction(method: string, path: string): string {
    // Extract resource name from path
    const pathSegments = path.split("/").filter(Boolean);
    const apiIndex = pathSegments.indexOf("api");

    if (apiIndex === -1 || apiIndex >= pathSegments.length - 1) {
      return `${method}_UNKNOWN`;
    }

    // Get resource name (e.g., "abis", "contracts")
    const resourceName = pathSegments[apiIndex + 1];
    const hasId = pathSegments.length > apiIndex + 2;

    // Map HTTP method to action verb
    const actionMap: Record<string, string> = {
      GET: hasId ? "READ" : "LIST",
      POST: "CREATE",
      PUT: "UPDATE",
      PATCH: "UPDATE",
      DELETE: "DELETE",
    };

    const actionVerb = actionMap[method] || method;
    const normalizedResource = resourceName.toUpperCase().replace(/-/g, "_");

    return `${actionVerb}_${normalizedResource}`;
  }

  /**
   * Auto-detect resource type from API path
   * /api/abis → abi
   * /api/contracts → contract
   */
  private detectResourceType(path: string): string | null {
    const resourceMap: Record<string, string> = {
      "/api/abis": "abi",
      "/api/contracts": "contract",
      "/api/networks": "network",
      "/api/api-keys": "api_key",
    };

    for (const [pathPrefix, resourceType] of Object.entries(resourceMap)) {
      if (path.startsWith(pathPrefix)) {
        return resourceType;
      }
    }

    return null;
  }

  /**
   * Build metadata object with error details and request info
   */
  private buildMetadata(input: LogApiRequestInput): Record<string, unknown> | null {
    const metadata: Record<string, unknown> = {};

    // Add error details if present
    if (input.error) {
      if (input.error instanceof Error) {
        metadata.error = {
          name: input.error.name,
          message: input.error.message,
          stack: input.error.stack?.split("\n").slice(0, 5), // First 5 lines only
        };
      } else {
        metadata.error = String(input.error);
      }
    }

    // Add sanitized request body (exclude sensitive fields)
    if (input.requestBody) {
      metadata.requestBody = this.sanitizeRequestBody(input.requestBody);
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
  }

  /**
   * Sanitize request body by removing sensitive fields
   */
  private sanitizeRequestBody(body: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "apiKey",
      "api_key",
      "authorization",
      "privateKey",
      "private_key",
    ];

    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  /**
   * Build list params with smart defaults
   */
  static buildListParams(options: {
    page?: number;
    limit?: number;
    userId?: string;
    apiKeyId?: string;
    method?: string;
    action?: string;
    resourceType?: string;
    statusCode?: number;
    startDate?: string;
    endDate?: string;
    sortBy?: "createdAt" | "duration" | "statusCode";
    sortOrder?: "asc" | "desc";
  }) {
    return {
      page: options.page || 1,
      limit: Math.min(options.limit || 20, 100), // Max 100 per page
      filters: {
        ...(options.userId && { userId: options.userId }),
        ...(options.apiKeyId && { apiKeyId: options.apiKeyId }),
        ...(options.method && { method: options.method }),
        ...(options.action && { action: options.action }),
        ...(options.resourceType && { resourceType: options.resourceType }),
        ...(options.statusCode && { statusCode: options.statusCode }),
        ...(options.startDate && { startDate: new Date(options.startDate) }),
        ...(options.endDate && { endDate: new Date(options.endDate) }),
      },
      sortBy: options.sortBy || ("createdAt" as const),
      sortOrder: options.sortOrder || ("desc" as const),
    };
  }
}
