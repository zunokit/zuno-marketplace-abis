/**
 * Cache configuration constants
 * Centralized timing configuration for maintainability
 */

export const CACHE_TIME = {
  // Stale times (how long data is considered fresh)
  STALE: {
    SHORT: 30 * 1000,        // 30 seconds - frequently changing data
    MEDIUM: 5 * 60 * 1000,   // 5 minutes - moderate changes
    LONG: 15 * 60 * 1000,    // 15 minutes - rarely changes
  },

  // Garbage collection times (how long to keep in cache)
  GC: {
    SHORT: 5 * 60 * 1000,    // 5 minutes
    MEDIUM: 10 * 60 * 1000,  // 10 minutes
    LONG: 30 * 60 * 1000,    // 30 minutes
  },
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;
