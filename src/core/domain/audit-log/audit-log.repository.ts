/**
 * Audit Log Repository Interface
 * Port for audit log data operations
 */

import type { AuditLogEntity, CreateAuditLogInput } from "./audit-log.entity";

export interface AuditLogFilters {
  userId?: string;
  apiKeyId?: string;
  method?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  statusCode?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface AuditLogListParams {
  page: number;
  limit: number;
  filters?: AuditLogFilters;
  sortBy?: "createdAt" | "duration" | "statusCode";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedAuditLogs {
  data: AuditLogEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuditLogRepository {
  /**
   * Create a new audit log entry
   */
  create(input: CreateAuditLogInput): Promise<AuditLogEntity>;

  /**
   * List audit logs with pagination and filters
   */
  list(params: AuditLogListParams): Promise<PaginatedAuditLogs>;

  /**
   * Find audit log by ID
   */
  findById(id: string): Promise<AuditLogEntity | null>;

  /**
   * Delete old audit logs (for cleanup jobs)
   */
  deleteOlderThan(date: Date): Promise<number>;

  /**
   * Get audit log statistics
   */
  getStats(filters?: AuditLogFilters): Promise<{
    totalRequests: number;
    totalErrors: number;
    avgDuration: number;
    requestsByMethod: Record<string, number>;
    requestsByAction: Record<string, number>;
  }>;
}
