/**
 * Response DTOs cho Network endpoints
 *
 * Giải quyết:
 * - Manual mapping dễ sai sót
 * - Type safety cho API responses
 * - Tách biệt Entity layer và Presentation layer
 * - Reusable mapping logic
 */

import type { NetworkEntity } from "@/core/domain/network/network.entity";

// ============ Response DTOs ============

/**
 * Standard Network response DTO
 */
export interface NetworkResponseDto {
  id: string;
  name: string;
  slug: string;
  chainId: number;
  rpcUrls: string[];
  explorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  type: string;
  isTestnet: boolean;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Network list item DTO
 */
export interface NetworkListItemDto {
  id: string;
  name: string;
  slug: string;
  chainId: number;
  type: string;
  isTestnet: boolean;
  isActive: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

/**
 * Paginated list response
 */
export interface PaginatedNetworkResponseDto {
  data: NetworkListItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============ DTO Mappers ============

/**
 * Mapper pattern để convert Entity -> DTO
 */
export class NetworkDtoMapper {
  /**
   * Convert entity sang full response DTO
   */
  static toResponseDto(entity: NetworkEntity): NetworkResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      chainId: entity.chainId,
      rpcUrls: entity.rpcUrls,
      explorerUrls: entity.explorerUrls || [],
      nativeCurrency: entity.nativeCurrency,
      type: entity.type,
      isTestnet: entity.isTestnet,
      isActive: entity.isActive,
      metadata: null, // NetworkEntity doesn't have metadata field
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  /**
   * Convert entity sang list item DTO (lightweight)
   */
  static toListItemDto(entity: NetworkEntity): NetworkListItemDto {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      chainId: entity.chainId,
      type: entity.type,
      isTestnet: entity.isTestnet,
      isActive: entity.isActive,
      nativeCurrency: entity.nativeCurrency,
    };
  }

  /**
   * Convert array of entities sang list DTOs
   */
  static toListDtos(entities: NetworkEntity[]): NetworkListItemDto[] {
    return entities.map(entity => this.toListItemDto(entity));
  }

  /**
   * Convert paginated result sang paginated response DTO
   */
  static toPaginatedResponseDto(result: {
    data: NetworkEntity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }): PaginatedNetworkResponseDto {
    return {
      data: this.toListDtos(result.data),
      pagination: result.pagination,
    };
  }
}
