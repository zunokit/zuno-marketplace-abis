/**
 * Contract Query Service
 *
 * Service layer để xử lý business logic cho Contract queries
 * Tách biệt khỏi route handlers
 */

import type { ContractListParams } from "@/core/domain/contract/contract.entity";

// ============ Types ============

export interface ContractListFilters {
  networkId?: string;
  abiId?: string;
  type?: string;
  isVerified?: boolean;
  deployer?: string;
}

export interface ListQueryInput {
  page?: number;
  limit?: number;
  sortBy?: "name" | "createdAt" | "updatedAt" | "deployedAt"; // Match ContractListParams
  sortOrder?: "asc" | "desc";
  query?: string;
  networkId?: string;
  abiId?: string;
  type?: string;
  isVerified?: string;
  deployer?: string;
}

// ============ Contract Query Service ============

export class ContractQueryService {
  /**
   * Build list params từ query input
   */
  static buildListParams(input: ListQueryInput): ContractListParams {
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
  private static buildFilters(input: ListQueryInput): ContractListFilters {
    const filters: ContractListFilters = {};

    if (input.networkId) {
      filters.networkId = input.networkId;
    }

    if (input.abiId) {
      filters.abiId = input.abiId;
    }

    if (input.type) {
      filters.type = input.type;
    }

    if (input.isVerified !== undefined) {
      filters.isVerified = input.isVerified === "true";
    }

    if (input.deployer) {
      filters.deployer = input.deployer;
    }

    return filters;
  }
}
