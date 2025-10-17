/**
 * Response DTOs cho Contract endpoints
 *
 * Giải quyết:
 * - Manual mapping dễ sai sót
 * - Type safety cho API responses
 * - Tách biệt Entity layer và Presentation layer
 * - Reusable mapping logic
 */

import type { ContractEntity } from "@/core/domain/contract/contract.entity";
import type { AbiEntity } from "@/core/domain/abi/abi.entity";

// ============ Response DTOs ============

/**
 * Standard Contract response DTO
 */
export interface ContractResponseDto {
  id: string;
  address: string;
  networkId: string;
  abiId: string;
  name: string | null;
  type: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  verificationSource: string | null;
  metadata: Record<string, unknown> | null;
  deployedAt: string | null;
  deployer: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Contract with ABI response
 */
export interface ContractWithAbiResponseDto {
  contract: ContractResponseDto;
  abi?: {
    id: string;
    name: string;
    abi: unknown;
    version: string;
    standard: string | null;
  };
}

/**
 * Contract list item DTO (lightweight)
 */
export interface ContractListItemDto {
  id: string;
  address: string;
  networkId: string;
  abiId: string;
  name: string | null;
  type: string | null;
  isVerified: boolean;
  deployedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated list response
 */
export interface PaginatedContractResponseDto {
  data: ContractListItemDto[];
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
 * Created Contract response
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CreatedContractResponseDto extends ContractResponseDto {}

/**
 * Updated Contract response
 */
export interface UpdatedContractResponseDto {
  contract: ContractResponseDto;
  abiChanged: boolean;
}

/**
 * Deleted Contract response
 */
export interface DeletedContractResponseDto {
  success: boolean;
  message: string;
  deletedAt: string;
}

// ============ DTO Mappers ============

/**
 * Mapper pattern để convert Entity -> DTO
 */
export class ContractDtoMapper {
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
   * Helper for nullable dates
   */
  private static toISOStringOrNull(date: Date | string | null | undefined): string | null {
    if (!date) {
      return null;
    }
    if (typeof date === 'string') {
      return date;
    }
    if (date instanceof Date) {
      return date.toISOString();
    }
    return null;
  }

  /**
   * Convert entity sang full response DTO
   */
  static toResponseDto(entity: ContractEntity): ContractResponseDto {
    return {
      id: entity.id,
      address: entity.address,
      networkId: entity.networkId,
      abiId: entity.abiId,
      name: entity.name || null,
      type: entity.type || null,
      isVerified: entity.isVerified,
      verifiedAt: this.toISOStringOrNull(entity.verifiedAt),
      verificationSource: entity.verificationSource || null,
      metadata: entity.metadata || null,
      deployedAt: this.toISOStringOrNull(entity.deployedAt),
      deployer: entity.deployer || null,
      createdAt: this.toISOString(entity.createdAt),
      updatedAt: this.toISOString(entity.updatedAt),
    };
  }

  /**
   * Convert entity với ABI
   */
  static toResponseWithAbiDto(
    entity: ContractEntity,
    abi?: AbiEntity
  ): ContractWithAbiResponseDto {
    return {
      contract: this.toResponseDto(entity),
      abi: abi
        ? {
            id: abi.id,
            name: abi.name,
            abi: abi.abi,
            version: abi.version,
            standard: abi.standard || null,
          }
        : undefined,
    };
  }

  /**
   * Convert entity sang list item DTO (lightweight)
   */
  static toListItemDto(entity: ContractEntity): ContractListItemDto {
    return {
      id: entity.id,
      address: entity.address,
      networkId: entity.networkId,
      abiId: entity.abiId,
      name: entity.name || null,
      type: entity.type || null,
      isVerified: entity.isVerified,
      deployedAt: this.toISOStringOrNull(entity.deployedAt),
      createdAt: this.toISOString(entity.createdAt),
      updatedAt: this.toISOString(entity.updatedAt),
    };
  }

  /**
   * Convert array of entities sang list DTOs
   */
  static toListDtos(entities: ContractEntity[]): ContractListItemDto[] {
    return entities.map(entity => this.toListItemDto(entity));
  }

  /**
   * Convert paginated result sang paginated response DTO
   */
  static toPaginatedResponseDto(result: {
    data: ContractEntity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }): PaginatedContractResponseDto {
    return {
      data: this.toListDtos(result.data),
      pagination: result.pagination,
    };
  }

  /**
   * Convert sang created response
   */
  static toCreatedResponseDto(
    entity: ContractEntity
  ): CreatedContractResponseDto {
    return this.toResponseDto(entity);
  }

  /**
   * Convert sang updated response
   */
  static toUpdatedResponseDto(
    entity: ContractEntity,
    abiChanged: boolean
  ): UpdatedContractResponseDto {
    return {
      contract: this.toResponseDto(entity),
      abiChanged,
    };
  }

  /**
   * Convert sang deleted response
   */
  static toDeletedResponseDto(): DeletedContractResponseDto {
    return {
      success: true,
      message: "Contract deleted successfully",
      deletedAt: new Date().toISOString(),
    };
  }
}
