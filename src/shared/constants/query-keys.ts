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

  // Add more entities as needed
  contracts: {
    all: ["contracts"] as const,
    // ...
  },

  networks: {
    all: ["networks"] as const,
    // ...
  },
} as const;
