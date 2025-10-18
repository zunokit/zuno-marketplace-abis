/**
 * Response DTOs cho ABI endpoints
 *
 * Giải quyết:
 * - Manual mapping dễ sai sót
 * - Type safety cho API responses
 * - Tách biệt Entity layer và Presentation layer
 * - Reusable mapping logic
 */

import type { AbiEntity } from "@/core/domain/abi/abi.entity";

// ============ Response DTOs ============

/**
 * Standard ABI response DTO
 * Sử dụng cho GET endpoints
 */
export interface AbiResponseDto {
  id: string;
  name: string;
  description: string | null;
  contractName: string | null;
  abi: unknown;
  abiHash: string;
  version: string;
  tags: string[];
  standard: string | null;
  metadata: Record<string, unknown> | null;
  ipfsHash: string | null;
  ipfsUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Created ABI response (có thêm IPFS info)
 * Sử dụng cho POST endpoint
 */
export interface CreatedAbiResponseDto extends AbiResponseDto {
  ipfsHash: string | null;
  ipfsUrl: string | null;
}

/**
 * List ABI response (lightweight version)
 * Không include full ABI data để giảm payload
 */
export interface AbiListItemDto {
  id: string;
  name: string;
  description: string | null;
  contractName: string | null;
  abiHash: string;
  version: string;
  tags: string[];
  standard: string | null;
  ipfsHash: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated list response
 */
export interface PaginatedAbiResponseDto {
  data: AbiListItemDto[];
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
 * Tách biệt domain logic và presentation logic
 */
export class AbiDtoMapper {
  /**
   * Helper to safely convert Date or string to ISO string
   */
  private static toISOString(date: Date | string | null | undefined): string {
    if (!date) {
      return new Date().toISOString();
    }
    if (typeof date === 'string') {
      return date;
    }
    if (date instanceof Date) {
      return date.toISOString();
    }
    return new Date().toISOString();
  }

  /**
   * Convert entity sang full response DTO
   */
  static toResponseDto(entity: AbiEntity): AbiResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description || null,
      contractName: entity.contractName || null,
      abi: entity.abi,
      abiHash: entity.abiHash,
      version: entity.version,
      tags: entity.tags || [],
      standard: entity.standard || null,
      metadata: entity.metadata || null,
      ipfsHash: entity.ipfsHash || null,
      ipfsUrl: entity.ipfsUrl || null,
      createdAt: this.toISOString(entity.createdAt),
      updatedAt: this.toISOString(entity.updatedAt),
    };
  }

  /**
   * Convert entity sang created response (POST endpoint)
   */
  static toCreatedResponseDto(
    entity: AbiEntity,
    ipfsData?: { hash?: string; url?: string }
  ): CreatedAbiResponseDto {
    return {
      ...this.toResponseDto(entity),
      ipfsHash: ipfsData?.hash || entity.ipfsHash || null,
      ipfsUrl: ipfsData?.url || entity.ipfsUrl || null,
    };
  }

  /**
   * Convert entity sang list item DTO (lightweight)
   * Không include full ABI để optimize performance
   */
  static toListItemDto(entity: AbiEntity): AbiListItemDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description || null,
      contractName: entity.contractName || null,
      abiHash: entity.abiHash,
      version: entity.version,
      tags: entity.tags || [],
      standard: entity.standard || null,
      ipfsHash: entity.ipfsHash || null,
      createdAt: this.toISOString(entity.createdAt),
      updatedAt: this.toISOString(entity.updatedAt),
    };
  }

  /**
   * Convert array of entities sang list DTOs
   */
  static toListDtos(entities: AbiEntity[]): AbiListItemDto[] {
    return entities.map(entity => this.toListItemDto(entity));
  }

  /**
   * Convert paginated result sang paginated response DTO (lightweight)
   * Without ABI JSON field for performance
   */
  static toPaginatedResponseDto(result: {
    data: AbiEntity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }): PaginatedAbiResponseDto {
    return {
      data: this.toListDtos(result.data),
      pagination: result.pagination,
    };
  }

  /**
   * Convert paginated result to FULL response DTO
   * Includes ABI JSON field - for Web3 integration
   */
  static toFullPaginatedResponseDto(result: {
    data: AbiEntity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }): { data: AbiResponseDto[]; pagination: PaginatedAbiResponseDto['pagination'] } {
    return {
      data: result.data.map(entity => this.toResponseDto(entity)),
      pagination: result.pagination,
    };
  }
}

// ============ Type Guards ============

/**
 * Runtime type checking cho DTOs
 * Useful cho validation và testing
 */
export function isAbiResponseDto(obj: unknown): obj is AbiResponseDto {
  if (typeof obj !== "object" || obj === null) return false;

  const dto = obj as AbiResponseDto;
  return (
    typeof dto.id === "string" &&
    typeof dto.name === "string" &&
    typeof dto.abiHash === "string" &&
    typeof dto.version === "string" &&
    Array.isArray(dto.tags) &&
    typeof dto.createdAt === "string" &&
    typeof dto.updatedAt === "string"
  );
}

export function isPaginatedAbiResponseDto(
  obj: unknown
): obj is PaginatedAbiResponseDto {
  if (typeof obj !== "object" || obj === null) return false;

  const dto = obj as PaginatedAbiResponseDto;
  return (
    Array.isArray(dto.data) &&
    typeof dto.pagination === "object" &&
    typeof dto.pagination.page === "number" &&
    typeof dto.pagination.total === "number"
  );
}
