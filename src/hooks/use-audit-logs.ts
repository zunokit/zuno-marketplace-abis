/**
 * Audit Logs Data Hooks
 * React Query hooks for audit log management
 *
 * Architecture:
 * - Hooks handle React Query logic only
 * - Server actions handle data operations
 * - Types imported from shared types
 * - Cache keys from centralized factory
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/query-keys";
import { CACHE_TIME, PAGINATION } from "@/shared/constants/cache-config";
import { getAuditLogs, getAuditLogStats } from "@/app/admin/audit-logs/actions";
import type { AuditLogEntity } from "@/core/domain/audit-log/audit-log.entity";

export interface AuditLogFilters {
  method?: string;
  statusCode?: number;
  startDate?: string;
  endDate?: string;
  userId?: string;
  apiKeyId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
}

export interface AuditLogStats {
  totalRequests: number;
  totalErrors: number;
  avgDuration: number;
  requestsByMethod: Record<string, number>;
  requestsByAction: Record<string, number>;
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

/**
 * Fetch paginated audit logs
 */
export function useAuditLogs(
  page: number = PAGINATION.DEFAULT_PAGE,
  limit: number = PAGINATION.DEFAULT_LIMIT,
  filters?: AuditLogFilters,
  options?: {
    sortBy?: "createdAt" | "duration" | "statusCode";
    sortOrder?: "asc" | "desc";
  }
) {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(page, limit, filters, options),
    queryFn: async () => {
      return getAuditLogs({
        page,
        limit,
        ...filters,
        sortBy: options?.sortBy || "createdAt",
        sortOrder: options?.sortOrder || "desc",
      });
    },
    staleTime: CACHE_TIME.STALE.SHORT,
    gcTime: CACHE_TIME.GC.MEDIUM,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch audit log statistics
 */
export function useAuditLogStats(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: queryKeys.auditLogs.stats(filters),
    queryFn: async () => {
      return getAuditLogStats(filters);
    },
    staleTime: CACHE_TIME.STALE.SHORT,
    gcTime: CACHE_TIME.GC.MEDIUM,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch single audit log by ID
 */
export function useAuditLog(id: string) {
  return useQuery({
    queryKey: queryKeys.auditLogs.detail(id),
    queryFn: async () => {
      // This would need to be implemented in actions
      throw new Error("getAuditLogById not implemented yet");
    },
    enabled: !!id,
    staleTime: CACHE_TIME.STALE.SHORT,
    gcTime: CACHE_TIME.GC.MEDIUM,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Invalidate audit logs cache
 */
export function useInvalidateAuditLogs() {
  const queryClient = useQueryClient();

  return {
    invalidateList: (filters?: AuditLogFilters) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.auditLogs.listAll(filters),
      });
    },
    invalidateStats: (filters?: AuditLogFilters) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.auditLogs.stats(filters),
      });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.auditLogs.all,
      });
    },
  };
}
