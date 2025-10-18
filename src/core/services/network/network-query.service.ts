/**
 * Network Query Service
 *
 * Service layer để xử lý business logic cho Network queries
 * Tách biệt khỏi route handlers
 */

import type { NetworkListParams } from "@/core/domain/network/network.entity";

// ============ Types ============

export interface NetworkListFilters {
  type?: string;
  isTestnet?: boolean;
  isActive?: boolean;
}

export interface ListQueryInput {
  page?: number;
  limit?: number;
  sortBy?: "name" | "chainId" | "createdAt"; // Match NetworkListParams
  sortOrder?: "asc" | "desc";
  query?: string;
  type?: string;
  isTestnet?: string;
  isActive?: string;
  all?: string;
}

// ============ Network Query Service ============

export class NetworkQueryService {
  /**
   * Build list params từ query input
   */
  static buildListParams(input: ListQueryInput): NetworkListParams {
    const filters = this.buildFilters(input);

    return {
      page: input.page ?? 1,
      limit: input.limit ?? 20,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      query: input.query,
      filters,
    };
  }

  /**
   * Build filters từ input
   */
  private static buildFilters(input: ListQueryInput): NetworkListFilters {
    const filters: NetworkListFilters = {};

    if (input.type) {
      filters.type = input.type;
    }

    if (input.isTestnet !== undefined) {
      filters.isTestnet = input.isTestnet === "true";
    }

    if (input.isActive !== undefined) {
      filters.isActive = input.isActive === "true";
    }

    return filters;
  }
}
