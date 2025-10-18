/**
 * React Query key factory pattern
 * Centralized query key management for cache control
 *
 * Benefits:
 * - Type-safe query keys
 * - Easy to invalidate related queries
 * - Prevents typos and inconsistencies
 */

export const queryKeys = {
  abis: {
    all: ["abis"] as const,
    lists: () => [...queryKeys.abis.all, "list"] as const,
    list: (page: number, limit: number) =>
      [...queryKeys.abis.lists(), { page, limit }] as const,
    details: () => [...queryKeys.abis.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.abis.details(), id] as const,
  },

  apiKeys: {
    all: ["apiKeys"] as const,
    details: () => [...queryKeys.apiKeys.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.apiKeys.details(), id] as const,
  },

  contracts: {
    all: ["contracts"] as const,
    lists: () => [...queryKeys.contracts.all, "list"] as const,
    list: (page: number, limit: number) =>
      [...queryKeys.contracts.lists(), { page, limit }] as const,
    details: () => [...queryKeys.contracts.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.contracts.details(), id] as const,
  },

  networks: {
    all: ["networks"] as const,
    lists: () => [...queryKeys.networks.all, "list"] as const,
    list: (page: number, limit: number) =>
      [...queryKeys.networks.lists(), { page, limit }] as const,
    details: () => [...queryKeys.networks.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.networks.details(), id] as const,
  },

  users: {
    all: ["users"] as const,
    lists: () => [...queryKeys.users.all, "list"] as const,
    list: (page: number, limit: number) =>
      [...queryKeys.users.lists(), { page, limit }] as const,
    details: () => [...queryKeys.users.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },

  auditLogs: {
    all: ["auditLogs"] as const,
    lists: () => [...queryKeys.auditLogs.all, "list"] as const,
    list: (page: number, limit: number, filters?: any, options?: any) =>
      [
        ...queryKeys.auditLogs.lists(),
        { page, limit, filters, options },
      ] as const,
    listAll: (filters?: any) =>
      [...queryKeys.auditLogs.lists(), { filters }] as const,
    details: () => [...queryKeys.auditLogs.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.auditLogs.details(), id] as const,
    stats: (filters?: any) =>
      [...queryKeys.auditLogs.all, "stats", { filters }] as const,
  },
} as const;
