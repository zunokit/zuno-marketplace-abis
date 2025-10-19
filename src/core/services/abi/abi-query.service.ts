/**
 * ABI Query Service
 *
 * Service layer để xử lý business logic cho ABI queries
 * Tách biệt khỏi route handlers
 */

import type { AbiListParams } from "@/core/domain/abi/abi.entity";
import { ApiError } from "@/shared/lib/api/api-handler";
import { ErrorCode } from "@/shared/types";

// ============ Types ============

export interface AbiListFilters {
  userId?: string;
  contractName?: string;
  standard?: string;
  tags?: string[];
  compatibleNetworks?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface AuthContext {
  user?: {
    id: string;
    role: string;
  };
  apiKey?: {
    userId: string;
  };
}

export interface ListQueryInput {
  page?: number;
  limit?: number;
  sortBy?: "name" | "createdAt" | "updatedAt" | "version";
  sortOrder?: "asc" | "desc";
  query?: string;
  contractName?: string;
  standard?: string;
  tags?: string | string[];
  compatibleNetworks?: string | string[];
  userId?: string;
}

// ============ ABI Query Service ============

export class AbiQueryService {
  /**
   * Build list params từ query input
   * Centralized logic để dễ maintain và test
   */
  static buildListParams(
    input: ListQueryInput,
    context: AuthContext
  ): AbiListParams {
    const filters = this.buildFilters(input, context);

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
   * Parse CSV strings và validate access
   */
  private static buildFilters(
    input: ListQueryInput,
    context: AuthContext
  ): AbiListFilters {
    const filters: AbiListFilters = {};

    // Contract name filter
    if (input.contractName) {
      filters.contractName = input.contractName;
    }

    // Standard filter
    if (input.standard) {
      filters.standard = input.standard;
    }

    // Tags filter (parse CSV string nếu cần)
    if (input.tags) {
      filters.tags = this.parseArrayOrCsv(input.tags);
    }

    // Compatible networks filter
    if (input.compatibleNetworks) {
      filters.compatibleNetworks = this.parseArrayOrCsv(input.compatibleNetworks);
    }

    // User ID filter với authorization check
    if (input.userId) {
      this.validateUserAccess(input.userId, context);
      filters.userId = input.userId;
    }

    return filters;
  }

  /**
   * Parse array hoặc CSV string sang array
   * Helper để xử lý query params có thể là string hoặc array
   */
  private static parseArrayOrCsv(value: string | string[]): string[] {
    if (Array.isArray(value)) {
      return value;
    }
    return value.split(",").map(item => item.trim()).filter(Boolean);
  }

  /**
   * Validate user access cho userId filter
   * Only admins can query other users' data
   */
  private static validateUserAccess(
    requestedUserId: string,
    context: AuthContext
  ): void {
    const isAdmin = context.user?.role === "admin";
    const isOwnUser =
      context.user?.id === requestedUserId ||
      context.apiKey?.userId === requestedUserId;

    if (!isAdmin && !isOwnUser) {
      throw new ApiError(
        "You can only list your own ABIs unless you're an admin",
        ErrorCode.FORBIDDEN,
        403
      );
    }
  }
}
